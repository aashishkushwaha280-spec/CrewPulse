from database import get_db_connection

def seed_database():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if events already seeded
    cursor.execute("SELECT COUNT(*) FROM events")
    count = cursor.fetchone()[0]
    if count > 0:
        print(f"Database is already seeded ({count} events found). No action needed.")
        conn.close()
        return

    # Seed Default Users
    users_data = [
        (
            'org-demo-1',
            'Vikramaditya Roy',
            'vikram@nexusevents.com',
            'nexus123',
            'ORGANIZER',
            'Managing Director',
            'Nexus Event Tech Pvt Ltd',
            '+91 98450 12345',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=260&q=80',
            1,
            184000,
            0,
            0,
            98
        ),
        (
            'stf-demo-1',
            'Aarav Sharma',
            'aarav.sharma@crewpulse.in',
            'crew123',
            'STAFF',
            'Lead Guest Protocol & VIP Liaison',
            'Independent Event Professional',
            '+91 98765 43210',
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=260&q=80',
            1,
            0,
            14250,
            88500,
            98
        )
    ]
    cursor.executemany("""
    INSERT OR REPLACE INTO users (id, name, email, password, role, title, organization, phone, avatar, verified, escrow_balance, wallet_balance, lifetime_earnings, reliability_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, users_data)

    # Seed Events
    events_data = [
        ('evt-101', 'Bangalore Tech Summit 2026', 'Oct 14-16, 2026', 'Bangalore Palace Grounds, Bengaluru', 'LIVE', 60, 54, 48, 184000, '08:00 AM - 08:00 PM'),
        ('evt-102', 'Sunburn Arena EDM Festival', 'Nov 02-04, 2026', 'Bhartiya City, North Bengaluru', 'UPCOMING', 120, 85, 0, 420000, '02:00 PM - 01:00 AM'),
        ('evt-103', 'Global FinTech Conclave', 'Oct 28-29, 2026', 'KTPO Exhibition Center, Whitefield', 'UPCOMING', 40, 40, 0, 160000, '09:00 AM - 06:00 PM')
    ]
    cursor.executemany("""
    INSERT OR REPLACE INTO events (id, name, date, venue, status, total_staff_needed, staff_hired, staff_on_site, escrow_total, shift_hours)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, events_data)

    # Seed Staff Members
    staff_data = [
        ('stf-001', 'Aarav Sharma', 'Lead Protocol Specialist', 4.5, 98, 4.9, 850, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', 1, 'ON_SITE', 'evt-101', 'VIP Lounge North', '07:22 AM', '+91 98450 11001'),
        ('stf-002', "Rohan 'Ronnie' Verma", 'Chief Bouncer & Crowd Lead', 6.0, 99, 5.0, 1100, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', 1, 'ON_SITE', 'evt-101', 'Gate 1 Turnstiles', '07:14 AM', '+91 98450 11002'),
        ('stf-003', 'Pooja Hegde-Deshmukh', 'Lead Sound & Stage Tech', 5.0, 95, 4.8, 950, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', 1, 'ON_SITE', 'evt-101', 'Main Stage Audio Booth', '07:28 AM', '+91 98450 11003'),
        ('stf-004', 'Kabir Mehta', 'Crowd & Security Specialist', 3.5, 94, 4.7, 750, 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80', 1, 'EN_ROUTE', 'evt-101', 'Outer Perimeter', None, '+91 98450 11004'),
        ('stf-005', 'Ananya Swaminathan', 'Lead Registration Lead', 4.0, 97, 4.9, 800, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80', 1, 'ON_SITE', 'evt-101', 'Registration Foyer', '07:05 AM', '+91 98450 11005'),
        ('stf-006', 'Tariq Al-Mansoor', 'Bartender & Mixologist', 5.5, 96, 4.8, 900, 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80', 1, 'AVAILABLE', None, 'Standby Reserve', None, '+91 98450 11006'),
        ('stf-007', 'Sneha Nair', 'Paramedic & Emergency Care', 7.0, 100, 5.0, 1250, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80', 1, 'ON_SITE', 'evt-101', 'Medical Bay Central', '07:18 AM', '+91 98450 11007')
    ]
    cursor.executemany("""
    INSERT OR REPLACE INTO staff (id, name, role, experience_years, reliability_score, rating, hourly_rate, avatar, verified, current_status, assigned_event_id, zone, clocked_in_time, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, staff_data)

    # Seed Shifts Feed
    shifts_data = [
        ('sft-201', 'evt-101', 'VIP Lounge Protocol Officer', 'Bangalore Tech Summit 2026', 'VIP Hospitality Host', 850, 8, 6800, 'Oct 14, 2026', '08:00 AM - 04:00 PM', 'Palace Grounds, Bangalore', 'Dark Formal Suit / Blazer', 3, 1, 'HIGH', 1),
        ('sft-202', 'evt-101', 'Head Bouncer - Red Carpet Entry', 'Bangalore Tech Summit 2026', 'Chief Bouncer & Crowd Control', 1100, 9, 9900, 'Oct 14, 2026', '07:30 AM - 04:30 PM', 'Gate 1, Palace Grounds', 'Black Security Uniform & Comms', 2, 1, 'CRITICAL', 1),
        ('sft-203', 'evt-102', 'Stage Sound Technician (EDM Main Stage)', 'Sunburn Arena EDM Festival', 'Lead AV Technician', 1200, 10, 12000, 'Nov 02, 2026', '02:00 PM - 12:00 AM', 'Bhartiya City, Bangalore', 'Crew Pulse Black Tee & Cargo', 4, 1, 'NORMAL', 1),
        ('sft-204', 'evt-103', 'Fintech Accreditation Lead', 'Global FinTech Conclave', 'Accreditation Desk Lead', 750, 8, 6000, 'Oct 28, 2026', '08:30 AM - 04:30 PM', 'KTPO Whitefield', 'Business Casual', 5, 1, 'NORMAL', 1)
    ]
    cursor.executemany("""
    INSERT OR REPLACE INTO shifts (id, event_id, title, event_name, role, rate_per_hour, duration_hours, total_pay, date, time_window, venue, dress_code, spots_left, escrow_locked, urgency, verified_required)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, shifts_data)

    # Seed Escrow Transactions
    escrow_data = [
        ('tx-901', 'evt-101', 'stf-001', 'Aarav Sharma', 'Lead Protocol Specialist', 8.0, 850, 6800, 340, 6460, 'DISBURSED', '2026-10-14 16:30', '0x7f9a23b8c4d1...'),
        ('tx-902', 'evt-101', 'stf-002', "Rohan 'Ronnie' Verma", 'Chief Bouncer & Crowd Lead', 9.0, 1100, 9900, 495, 9405, 'ESCROW_LOCKED', '2026-10-14 16:35', '0x4e2d89a1f7c3...'),
        ('tx-903', 'evt-101', 'stf-005', 'Ananya Swaminathan', 'Lead Registration Lead', 8.0, 800, 6400, 320, 6080, 'ESCROW_LOCKED', '2026-10-14 16:40', '0x1c3f58e9b2a6...')
    ]
    cursor.executemany("""
    INSERT OR REPLACE INTO escrow_txns (id, event_id, staff_id, staff_name, role, hours_logged, hourly_rate, gross_amount, platform_fee, net_payout, status, timestamp, escrow_tx_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, escrow_data)

    # Seed Attendance Logs
    attendance_data = [
        ('att-1', 'stf-005', 'Ananya Swaminathan', 'CHECK_IN', '07:05 AM', 'Turnstile QR Scan', 'Registration Foyer'),
        ('att-2', 'stf-002', "Rohan 'Ronnie' Verma", 'CHECK_IN', '07:14 AM', 'Geofenced Biometric', 'Gate 1 Turnstiles'),
        ('att-3', 'stf-007', 'Sneha Nair', 'CHECK_IN', '07:18 AM', 'Geofenced Biometric', 'Medical Bay Central'),
        ('att-4', 'stf-001', 'Aarav Sharma', 'CHECK_IN', '07:22 AM', 'Turnstile QR Scan', 'VIP Lounge North'),
        ('att-5', 'stf-003', 'Pooja Hegde-Deshmukh', 'CHECK_IN', '07:28 AM', 'Geofenced Biometric', 'Main Stage Audio Booth')
    ]
    cursor.executemany("""
    INSERT OR REPLACE INTO attendance_logs (id, staff_id, staff_name, type, timestamp, method, location)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, attendance_data)

    conn.commit()
    conn.close()
    print("CrewPulse database seeded successfully!")

if __name__ == "__main__":
    from database import init_db
    print("Initializing database tables...")
    init_db()
    print("Seeding database records...")
    seed_database()

