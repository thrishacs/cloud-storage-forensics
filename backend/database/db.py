import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'forensics.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def save_report(report):
    conn = get_db()
    conn.execute(
        'INSERT INTO reports (timestamp, action, location, location_full, device, file_size_mb, risk_score, risk_level, label, recommendation) VALUES (?,?,?,?,?,?,?,?,?,?)',
        (report['timestamp'], report['action'], report['location'], report['location_full'],
         report['device'], report['file_size_mb'], report['risk_score'], report['risk_level'],
         report['label'], report['recommendation'])
    )
    conn.commit()
    conn.close()

def get_reports():
    conn = get_db()
    rows = conn.execute('SELECT * FROM reports ORDER BY id DESC LIMIT 100').fetchall()
    conn.close()
    return [dict(r) for r in rows]

def clear_reports():
    conn = get_db()
    conn.execute('DELETE FROM reports')
    conn.commit()
    conn.close()

def get_logs(page=1, per_page=50, search='', anomaly=''):
    conn = get_db()
    where = []
    params = []
    if search:
        where.append('(user_id LIKE ? OR action LIKE ? OR location LIKE ? OR ip_address LIKE ?)')
        params.extend([f'%{search}%']*4)
    if anomaly == '1':
        where.append('is_anomaly = 1')
    elif anomaly == '0':
        where.append('is_anomaly = 0')
    where_sql = 'WHERE ' + ' AND '.join(where) if where else ''
    total = conn.execute(f'SELECT COUNT(*) FROM forensic_logs {where_sql}', params).fetchone()[0]
    offset = (page-1)*per_page
    rows = conn.execute(f'SELECT * FROM forensic_logs {where_sql} LIMIT ? OFFSET ?', params+[per_page, offset]).fetchall()
    conn.close()
    return [dict(r) for r in rows], total
