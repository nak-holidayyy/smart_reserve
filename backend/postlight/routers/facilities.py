from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query

import psycopg
from fastapi import APIRouter

from postlight.database import connection

router = APIRouter()


@router.get("/facilities")
def list_facilities():
    with connection() as conn, conn.cursor(
        row_factory=psycopg.rows.dict_row
    ) as cur:
        cur.execute("""
            SELECT id, name, description, location, capacity
            FROM public.facilities
            WHERE is_active = TRUE
            ORDER BY name;
        """)
        return cur.fetchall()


@router.get("/facilities/{facility_id}/availability")
def check_availability(
    facility_id: UUID,
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    exclude_booking_id: UUID | None = Query(None),
):
    # Check that the time range is valid
    if end_time <= start_time:
        raise HTTPException(
            status_code=400,
            detail="End time must be after start time.",
        )

    # Require timezone-aware datetimes
    if start_time.tzinfo is None or end_time.tzinfo is None:
        raise HTTPException(
            status_code=400,
            detail="Please include a timezone in both times.",
        )

    with connection() as conn, conn.cursor() as cur:
        # Check that the facility exists and is active
        cur.execute(
            """
            SELECT is_active
            FROM public.facilities
            WHERE id = %s;
            """,
            (facility_id,),
        )
        facility = cur.fetchone()

        if facility is None or not facility[0]:
            raise HTTPException(
                status_code=404,
                detail="Facility not found or inactive.",
            )

        # Check for overlapping confirmed bookings,
        # excluding the booking currently being edited
        cur.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM public.bookings
                WHERE facility_id = %s
                  AND status = 'confirmed'
                  AND start_time < %s
                  AND end_time > %s
                  AND (CAST(%s AS uuid) IS NULL OR id != CAST(%s AS uuid))
            );
            """,
            (
                str(facility_id),
                end_time,
                start_time,
                str(exclude_booking_id) if exclude_booking_id else None,
                str(exclude_booking_id) if exclude_booking_id else None,
            ),
        )
        has_conflict = cur.fetchone()[0]

    return {
        "facility_id": str(facility_id),
        "start_time": start_time.isoformat(),
        "end_time": end_time.isoformat(),
        "available": not has_conflict,
    }
