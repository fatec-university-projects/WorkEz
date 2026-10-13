import os
import glob
import psycopg2

def run_migrations():
    conn_str = "host=localhost port=5432 dbname=WorkEz user=postgres password=postgres"
    print(f"Connecting to PostgreSQL: {conn_str}...")
    conn = psycopg2.connect(conn_str)
    conn.autocommit = True
    cursor = conn.cursor()

    scripts_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "WorkEzApi", "scripts"))
    sql_files = sorted(glob.glob(os.path.join(scripts_dir, "*.sql")))

    for fpath in sql_files:
        fname = os.path.basename(fpath)
        print(f"Applying migration: {fname}...")
        with open(fpath, "r", encoding="utf-8") as f:
            sql = f.read()
        try:
            cursor.execute(sql)
            print(f"  -> SUCCESS: {fname}")
        except Exception as e:
            print(f"  -> ERROR applying {fname}: {e}")

    # Verify columns in Providers, Services, and Addresses
    for table in ["Providers", "Services", "Addresses"]:
        cursor.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}' ORDER BY column_name;")
        cols = cursor.fetchall()
        col_names = [c[0] for c in cols]
        print(f"Table '{table}' columns: {col_names}")

    cursor.close()
    conn.close()
    print("Done!")

if __name__ == "__main__":
    run_migrations()
