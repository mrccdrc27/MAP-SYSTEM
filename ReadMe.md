# To Run:
1. Install Dependencies: 
for python: `pip install -r requirements.txt`
for frontend: `cd frontend`, `npm install`
2. Run the server:
in powershell: `bash ./start_servers.sh`
or
in git bash: `./start_servers.sh`

git rm -r --cached <folder>


seed: python manage.py seed_tickets --force


dependencies:
httpx
redis
faker
pip install celery
 

docker run -d --name redis -p 6379:6379 redis
<!-- celery does not need application running, celery worker is enough -->
celery -A your_application worker --pool=solo --loglevel=info
celery -A workflow_api worker -Q workflow_updates --loglevel=info
celery -A task_service worker -Q workflow_send_queue --loglevel=info --pool=solo
celery -A workflow_api worker --pool=solo --loglevel=info -Q ticket_tasks

update1