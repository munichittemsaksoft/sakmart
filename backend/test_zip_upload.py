from app.main import app
from fastapi.testclient import TestClient
import io

client = TestClient(app, raise_server_exceptions=True)

token = client.post('/api/v1/auth/login', json={'email':'test@test.com','password':'testpass1'}).json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

t = client.post('/api/v1/templates', headers=headers, json={
    'title':'Zip Test 2','category':'SaaS','agent_count':1
}).json()
slug = t.get('slug')
print('template slug:', slug)

fake_zip = io.BytesIO(b'PK\x03\x04' + b'\x00'*100)
try:
    r = client.post(f'/api/v1/templates/{slug}/zip', headers=headers,
        files={'file': ('test.zip', fake_zip, 'application/zip')})
    print('status:', r.status_code)
    print('body:', r.text[:800])
except Exception as e:
    import traceback
    traceback.print_exc()
