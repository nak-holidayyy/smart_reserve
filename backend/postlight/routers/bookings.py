
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from postlight.auth import get_current_user
from postlight.database import connection

router = APIRouter(prefix="/bookings", tags=["bookings"])


class BookingCreate(BaseModel):
    facility_id: UUID
    title: str = Field(min_length=1, max_length=200)
    purpose: str | None = None
    start_time: datetime
    end_time: datetime

class BookingUpdate(BaseModel):
    facility_id: UUID
    title: str = Field(min_length=1, max_length=200)
    purpose: str | None = None
    start_time: datetime
    end_time: datetime


@router.post("")
def create_booking(
    booking: BookingCreate,
    user: dict = Depends(get_current_user),
):
    if booking.start_time.tzinfo is None or booking.end_time.tzinfo is None:
        raise HTTPException(
            status_code=400,
            detail="Start and end times must include a timezone.",
        )

    start_time = booking.start_time.astimezone(timezone.utc)
    end_time = booking.end_time.astimezone(timezone.utc)

    if end_time <= start_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be later than start time.",
        )

    if start_time <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Bookings must be in the future.",
        )

    try:
        with connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO public.bookings
                        (facility_id, user_id, title, purpose,
                         start_time, end_time, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'confirmed')
                    RETURNING id, facility_id, user_id, title, purpose,
                              start_time, end_time, status
                    """,
                    (
                        str(booking.facility_id),
                        user["id"],
                        booking.title.strip(),
                        booking.purpose,
                        start_time,
                        end_time,
                    ),
                )
                row = cur.fetchone()

            conn.commit()

        return {
            "id": str(row[0]),
            "facility_id": str(row[1]),
            "user_id": str(row[2]),
            "title": row[3],
            "purpose": row[4],
            "start_time": row[5].isoformat(),
            "end_time": row[6].isoformat(),
            "status": row[7],
        }

    except Exception as exc:
        # PostgreSQL exclusion constraints reject overlapping bookings.
        if getattr(exc, "sqlstate", None) == "23P01":
            raise HTTPException(
                status_code=409,
                detail="This facility is already booked for that time.",
            ) from exc
        raise


@router.get("")
def get_my_bookings(
    user: dict = Depends(get_current_user),
):
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    b.id,
                    b.facility_id,
                    f.name AS facility_name,
                    f.location,
                    b.title,
                    b.purpose,
                    b.start_time,
                    b.end_time,
                    b.status
                FROM public.bookings AS b
                JOIN public.facilities AS f
                    ON f.id = b.facility_id
                WHERE b.user_id = %s
                ORDER BY b.start_time DESC
                """,
                (user["id"],),
            )
            rows = cur.fetchall()

    return [
        {
            "id": str(row[0]),
            "facility_id": str(row[1]),
            "facility_name": row[2],
            "location": row[3],
            "title": row[4],
            "purpose": row[5],
            "start_time": row[6].isoformat(),
            "end_time": row[7].isoformat(),
            "status": row[8],
        }
        for row in rows
    ]


@router.get("/calendar")
def get_calendar_bookings(
    user: dict = Depends(get_current_user),
):
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    b.id,
                    b.facility_id,
                    f.name AS facility_name,
                    f.location,
                    b.title,
                    b.start_time,
                    b.end_time,
                    b.status
                FROM public.bookings AS b
                JOIN public.facilities AS f
                    ON f.id = b.facility_id
                WHERE b.status = 'confirmed'
                  AND f.is_active = TRUE
                ORDER BY b.start_time ASC
                """
            )
            rows = cur.fetchall()

    return [
        {
            "id": str(row[0]),
            "facility_id": str(row[1]),
            "facility_name": row[2],
            "location": row[3],
            "title": row[4],
            "start_time": row[5].isoformat(),
            "end_time": row[6].isoformat(),
            "status": row[7],
        }
        for row in rows
    ]


@router.patch("/{booking_id}")
def update_booking(
    booking_id: UUID,
    booking: BookingUpdate,
    user: dict = Depends(get_current_user),
):
    if booking.start_time.tzinfo is None or booking.end_time.tzinfo is None:
        raise HTTPException(
            status_code=400,
            detail="Start and end times must include a timezone.",
        )

    start_time = booking.start_time.astimezone(timezone.utc)
    end_time = booking.end_time.astimezone(timezone.utc)

    if end_time <= start_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be later than start time.",
        )

    if start_time <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Bookings must be in the future.",
        )

    try:
        with connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE public.bookings
                    SET facility_id = %s,
                        title = %s,
                        purpose = %s,
                        start_time = %s,
                        end_time = %s
                    WHERE id = %s
                      AND user_id = %s
                      AND status = 'confirmed'
                    RETURNING id, facility_id, user_id, title, purpose,
                              start_time, end_time, status
                    """,
                    (
                        str(booking.facility_id),
                        booking.title.strip(),
                        booking.purpose,
                        start_time,
                        end_time,
                        str(booking_id),
                        user["id"],
                    ),
                )
                row = cur.fetchone()

                if row is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Booking not found or it has already been cancelled.",
                    )

            conn.commit()

        return {
            "id": str(row[0]),
            "facility_id": str(row[1]),
            "user_id": str(row[2]),
            "title": row[3],
            "purpose": row[4],
            "start_time": row[5].isoformat(),
            "end_time": row[6].isoformat(),
            "status": row[7],
            "message": "Booking updated successfully.",
        }

    except Exception as exc:
        if getattr(exc, "sqlstate", None) == "23P01":
            raise HTTPException(
                status_code=409,
                detail="This facility is already booked for that time.",
            ) from exc
        raise

@router.patch("/{booking_id}/cancel")
def cancel_booking(
    booking_id: UUID,
    user: dict = Depends(get_current_user),
):
    with connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE public.bookings
                SET status = 'cancelled',
                    cancelled_at = NOW()
                WHERE id = %s
                  AND user_id = %s
                  AND status = 'confirmed'
                RETURNING id, status, cancelled_at
                """,
                (str(booking_id), user["id"]),
            )

            row = cur.fetchone()

            if row is None:
                raise HTTPException(
                    status_code=404,
                    detail="Booking not found or it has already been cancelled.",
                )

        conn.commit()

    return {
        "id": str(row[0]),
        "status": row[1],
        "cancelled_at": row[2].isoformat(),
        "message": "Booking cancelled successfully.",
    }