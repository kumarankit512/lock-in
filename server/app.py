from flask import Flask, request, jsonify
from flask_cors import CORS
from models.User import User
from models.AuthToken import AuthToken
from models.Session import Session
from utils import validate_email, validate_password, validate_username, create_response
from bson import ObjectId
import json
from config import Config
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError, OperationFailure
import sys
from datetime import datetime, timedelta

class JSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        return super(JSONEncoder, self).default(obj)


app = Flask(__name__)
app.json_encoder = JSONEncoder
CORS(app)

@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        # Validate required fields
        required_fields = ['username', 'email', 'password']
        for field in required_fields:
            if not data.get(field):
                return create_response(False, f"{field} is required", status_code=400)
            
        username = data['username'].strip()
        email = data['email'].strip().lower()
        password = data['password']

        if not validate_email(email):
            return create_response(False, "Invalid email format", status_code=400)
        
        is_valid_username, username_msg = validate_username(username)
        if not is_valid_username:
            return create_response(False, username_msg, status_code=400)
        
        is_valid_password, password_msg = validate_password(password)
        if not is_valid_password:
            return create_response(False, password_msg, status_code=400)
        
        
        if User.find_by_email(email):
            return create_response(False, "User with this email already exists", status_code=409)
        
        if User.find_by_username(username):
            return create_response(False, "Username already taken", status_code=409)
        
        # Create new user
        password_hash = User.hash_password(password)
        new_user = User(username=username, email=email, password_hash=password_hash)
        new_user.save()

        # Generate JWT token
        token = AuthToken.generate_token(new_user._id)

        user_data = {
            'id': str(new_user._id),
            'username': new_user.username,
            'email': new_user.email
        }

        return create_response(
            True, 
            "User created successfully", 
            {'user': user_data, 'token': token}, 
            status_code=201
        )
    except Exception as e:
        return create_response(False, f"An error occurred: {str(e)}", status_code=500)


@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        if not data.get('email') or not data.get('password'):
            return create_response(False, "Email and password are required", status_code=400)
        
        email = data['email'].strip().lower()
        password = data['password']

        user = User.find_by_email(email)
        if not user:
            return create_response(False, "Invalid email or password", status_code=401)
        
        if not user.verify_password(password):
            return create_response(False, "Invalid email or password", status_code=401)
        
        token = AuthToken.generate_token(user._id)

        user_data = {
            'id': str(user._id),
            'username': user.username,
            'email': user.email
        }

        return create_response(
            True, 
            "Login successful", 
            {'user': user_data, 'token': token}
        )
    except Exception as e:
        return create_response(False, f"An error occurred: {str(e)}", status_code=500)

@app.route('/api/verify-token', methods=['POST'])
def verify_token():
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return create_response(False, "Token is required", status_code=400)
        
        user_id = AuthToken.verify_token(token)
        if not user_id:
            return create_response(False, "Invalid or expired token", status_code=401)
        
        user = User.find_by_id(user_id)
        if not user:
            return create_response(False, "User not found", status_code=404)
        
        user_data = {
            'id': str(user._id),
            'username': user.username,
            'email': user.email
        }
        
        return create_response(True, "Token is valid", {'user': user_data})
        
    except Exception as e:
        return create_response(False, f"An error occurred: {str(e)}", status_code=500)
    

#Create Session Endpoint
@app.route('/api/create-session', methods=['POST'])
def create_session():
    try:
        data = request.get_json()
        required_fields = [
            'user_id', 'username', 'date', 'time_started', 'total_hours',
            'intervals', 'time_per_interval', 'time_hair', 'time_nail',
            'time_eye', 'time_nose', 'time_unfocused', 'time_paused'
        ]
        for field in required_fields:
            if field not in data:
                return create_response(False, f"{field} is required", status_code=400)
        #Check if user exists
        if data['user_id'] and not User.find_by_id(data['user_id']):
            return create_response(False, "User not found", status_code=404)
        new_session = Session.from_dict(data)
        new_session.save()
        return create_response(True, "Session created successfully", {'session_id': str(new_session._id)}, status_code=201)

    except Exception as e:
        return create_response(False, f"An error occurred: {str(e)}", status_code=500)     

#Get sessions of a user
@app.route('/api/get-sessions/<user_id>', methods=['GET'])
def get_sessions(user_id):
    try:
        if not User.find_by_id(user_id=user_id):
            return create_response(False, "User not found", status_code=404)
        sessions = Session.get_recent_sessions(user_id=user_id, limit=10)
        return create_response(True, "Sessions retrieved successfully", {'sessions': [session.to_dict() for session in sessions]})

    except Exception as e:
        return create_response(False, f"An error occurred: {str(e)}", status_code=500)

#Get specific session by id
@app.route('/api/get-session/<session_id>', methods=['GET'])
def get_session(session_id):
    try:
        session = Session.find_by_id(session_id)
        if not session:
            return create_response(False, "Session not found", status_code=404)
        return create_response(True, "Session retrieved successfully", {'session': session.to_dict()})

    except Exception as e:
        return create_response(False, f'An error occurred: {str(e)}', status_code=500)

#Get sessions from date range
@app.route('/api/get-sessions-from-date/<user_id>/<start_date>/<end_date>', methods=['GET'])
def get_sessions_from_date(user_id, start_date, end_date):
    try:
        if not user_id or not start_date or not end_date:
            return create_response(False, "user_id, start_date and end_date are required", status_code=400)

        if not User.find_by_id(user_id=user_id):
            return create_response(False, "User not found", status_code=404)

        # Validate date formats
        try:
            datetime.strptime(start_date, '%Y-%m-%d')
            datetime.strptime(end_date, '%Y-%m-%d')
        except ValueError:
            return create_response(False, "Dates must be in YYYY-MM-DD format", status_code=400)

        # Validate start_date <= end_date
        start = datetime.strptime(start_date, '%Y-%m-%d')
        end = datetime.strptime(end_date, '%Y-%m-%d')
        if start > end:
            return create_response(False, "start_date cannot be after end_date", status_code=400)

        sessions = Session.get_user_sessions_in_date_range(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )
        return create_response(True, "Sessions retrieved successfully", {'sessions': [session.to_dict() for session in sessions]})

    except Exception as e:
        return create_response(False, f'An error occurred: {str(e)}', status_code=500)

@app.route('/')
def home():
    return jsonify({"message": "Flask backend is running!"})

@app.route('/api/data', methods=['POST'])
def get_data():
    data = request.get_json()
    return jsonify({"received": data})

def authenticateDB():
    try:
        client = MongoClient(
            Config.MONGO_URI,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=30000,
            socketTimeoutMS=30000
        )        
        
        client.admin.command('ping')
        print("MongoDB server is reachable")
        db = client.get_database("level_up")
        collection_names = db.list_collection_names()
        print(f"Database access successful. Collections: {collection_names}")
        return True

    except ServerSelectionTimeoutError:
        print("MongoDB connection failed: Server selection timeout - check if MongoDB is running")
        return False
    except ConnectionFailure:
        print("MongoDB connection failed: Cannot establish connection")
        return False
    except OperationFailure as e:
        if "Authentication failed" in str(e):
            print("MongoDB authentication failed: Invalid credentials")
        else:
            print(f"MongoDB operation failed: {str(e)}")
        return False
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return False

if __name__ == '__main__':
    print("Testing MongoDB connection on startup...")
    if authenticateDB():
        print("MongoDB connection verified. Starting Flask server...")
        app.run(debug=True, host='0.0.0.0', port=5001)
    else:
        print("Cannot start server: MongoDB connection failed")
        sys.exit(1)