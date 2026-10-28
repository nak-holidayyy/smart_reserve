
from postlight.database import connection

try:
    conn = connection()
    print("Connected to Smart Reserve!")

    rows = conn.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
              'facilities',
              'bookings',
              'waitlist',
              'notifications'
          )
        ORDER BY table_name;
    """).fetchall()

    print("Tables:", [row[0] for row in rows])
    conn.close()

except Exception as error:
    print("Connection test failed:", error)
