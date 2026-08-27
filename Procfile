web: gunicorn --chdir backend --workers 1 --threads 8 --bind 0.0.0.0:$PORT wsgi:app
release: cd backend && FLASK_APP=wsgi.py flask db upgrade
