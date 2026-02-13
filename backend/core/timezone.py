"""
Date/Time utilities for IST timezone handling.
All business operations should use IST (Indian Standard Time, UTC+5:30).
"""
from datetime import datetime, timezone, timedelta

# IST timezone offset (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

def get_ist_now():
    """Get current datetime in IST timezone"""
    return datetime.now(IST)

def get_ist_date():
    """Get current date string in IST timezone (YYYY-MM-DD)"""
    return datetime.now(IST).strftime("%Y-%m-%d")

def get_ist_time():
    """Get current time string in IST timezone (HH:MM:SS)"""
    return datetime.now(IST).strftime("%H:%M:%S")

def get_ist_datetime():
    """Get current datetime string in IST timezone (ISO format)"""
    return datetime.now(IST).isoformat()

def get_ist_datetime_display():
    """Get current datetime in display format (DD-MM-YYYY HH:MM AM/PM)"""
    return datetime.now(IST).strftime("%d-%m-%Y %I:%M %p")
