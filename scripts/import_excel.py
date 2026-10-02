import os
import sys
import zipfile
import sqlite3
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

def excel_date_to_str(serial):
    try:
        val = float(serial)
        dt = datetime(1899, 12, 30) + timedelta(days=val)
        return dt.strftime('%Y-%m-%d')
    except Exception:
        return str(serial)

def parse_xlsx(file_path):
    with zipfile.ZipFile(file_path, 'r') as z:
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            sst_root = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in sst_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
                text = "".join([t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text])
                shared_strings.append(text)

        def get_sheet_rows(sheet_path):
            sheet_root = ET.fromstring(z.read(sheet_path))
            rows = []
            for row_el in sheet_root.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
                cells = {}
                for c in row_el.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
                    r_attr = c.attrib.get('r')
                    col_letter = ''.join([ch for ch in r_attr if ch.isalpha()])
                    t_attr = c.attrib.get('t')
                    v_el = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    val = v_el.text if v_el is not None else ""
                    if t_attr == 's' and val != '':
                        val = shared_strings[int(val)]
                    cells[col_letter] = val
                rows.append(cells)
            return rows

        # Sheet 1: Expenses (Расходы)
        exp_rows = get_sheet_rows('xl/worksheets/sheet1.xml')
        expenses = []
        for r in exp_rows[1:]:
            a = r.get('A', '').strip()
            b = r.get('B', '').strip()
            c = r.get('C', '').strip()
            d = r.get('D', '').strip()
            if not a and not b and not c:
                continue
            date_str = excel_date_to_str(a)
            amount = float(b.replace(',', '.')) if b else 0.0
            category = c if c else "Другое"
            comment = d if d else None
            expenses.append({
                'date': date_str,
                'amount': amount,
                'category': category,
                'comment': comment,
                'type': 'expense'
            })

        # Sheet 2: Savings (Накопления)
        sav_rows = get_sheet_rows('xl/worksheets/sheet2.xml')
        savings = []
        for r in sav_rows[1:]:
            a = r.get('A', '').strip()
            b = r.get('B', '').strip()
            c = r.get('C', '').strip()
            f = r.get('F', '').strip()
            if a:
                date_str = excel_date_to_str(a)
                # Ensure date is YYYY-MM-01
                if len(date_str) == 10:
                    date_str = date_str[:7] + '-01'
                cash = float(b.replace(',', '.')) if b else 0.0
                electronic = float(c.replace(',', '.')) if c else 0.0
                global_projects = float(f.replace(',', '.')) if f else 0.0
                savings.append({
                    'date': date_str,
                    'cash': cash,
                    'electronic': electronic,
                    'global_projects': global_projects,
                    'debts': None
                })

        # Sheet 3: Incomes (Доходы)
        inc_rows = get_sheet_rows('xl/worksheets/sheet3.xml')
        incomes = []
        for r in inc_rows[1:]:
            a = r.get('A', '').strip()
            b = r.get('B', '').strip()
            c = r.get('C', '').strip()
            d = r.get('D', '').strip()
            if not a and not b and not c:
                continue
            date_str = excel_date_to_str(a)
            amount = float(b.replace(',', '.')) if b else 0.0
            category = c if c else "Другое"
            comment = d if d else None
            incomes.append({
                'date': date_str,
                'amount': amount,
                'category': category,
                'comment': comment,
                'type': 'income'
            })

        return expenses, savings, incomes

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    xlsx_path = os.path.join(root_dir, "Финансы.xlsx")
    db_path = os.path.join(root_dir, "backend", "db", "fullcup.db")

    if not os.path.exists(xlsx_path):
        print(f"Error: {xlsx_path} not found.")
        sys.exit(1)

    print(f"Reading {xlsx_path}...")
    expenses, savings, incomes = parse_xlsx(xlsx_path)
    print(f"Parsed: {len(expenses)} expenses, {len(incomes)} incomes, {len(savings)} savings records.")

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = OFF;")
    cursor = conn.cursor()

    try:
        cursor.execute("BEGIN TRANSACTION;")

        # 1. Clean existing tables
        cursor.execute("DELETE FROM transactions;")
        cursor.execute("DELETE FROM savings;")
        cursor.execute("DELETE FROM categories;")
        cursor.execute("DELETE FROM banks;")
        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('transactions', 'savings', 'categories', 'banks');")

        # 2. Seed Categories
        expense_cats = sorted(list(set([e['category'] for e in expenses])))
        income_cats = sorted(list(set([i['category'] for e in incomes for i in [e]])))

        cat_map = {} # (name, type) -> id
        for cat in expense_cats:
            cursor.execute("INSERT INTO categories (name, type) VALUES (?, ?);", (cat, 'expense'))
            cat_map[(cat, 'expense')] = cursor.lastrowid

        for cat in income_cats:
            cursor.execute("INSERT INTO categories (name, type) VALUES (?, ?);", (cat, 'income'))
            cat_map[(cat, 'income')] = cursor.lastrowid

        print(f"Inserted {len(cat_map)} categories ({len(expense_cats)} expenses, {len(income_cats)} incomes).")

        # 3. Seed Default Banks
        default_banks = [
            ("Продукты на месяц", 45000.0),
            ("Кайф Андрея", 20000.0),
            ("Кайф Дианы", 20000.0),
            ("Транспорт и авто", 15000.0),
            ("Кафе и развлечения", 15000.0)
        ]
        for name, limit in default_banks:
            cursor.execute("INSERT INTO banks (name, month_limit) VALUES (?, ?);", (name, limit))
        print(f"Inserted {len(default_banks)} default banks.")

        # 4. Insert Transactions
        all_tx = expenses + incomes
        for tx in all_tx:
            cat_id = cat_map.get((tx['category'], tx['type']))
            cursor.execute(
                "INSERT INTO transactions (amount, type, category_id, bank_id, date, comment) VALUES (?, ?, ?, ?, ?, ?);",
                (tx['amount'], tx['type'], cat_id, None, tx['date'], tx['comment'])
            )
        print(f"Inserted {len(all_tx)} transactions.")

        # 5. Insert Savings
        for s in savings:
            cursor.execute(
                "INSERT INTO savings (date, cash, electronic, global_projects, debts) VALUES (?, ?, ?, ?, ?);",
                (s['date'], s['cash'], s['electronic'], s['global_projects'], s['debts'])
            )
        print(f"Inserted {len(savings)} savings records.")

        conn.commit()
        print("Migration successfully completed!")
    except Exception as e:
        conn.rollback()
        print(f"Migration error: {e}")
        sys.exit(1)
    finally:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.close()

if __name__ == "__main__":
    main()
