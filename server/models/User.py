from pymongo import MongoClient
from config import Config
import bcrypt
from datetime import datetime, timedelta
import jwt
from bson import ObjectId

client = MongoClient(Config.MONGO_URI)
db = client.get_database("level_up")
users_collection = db.users

class User:
    def __init__(self, username, email, password_hash=None, _id=None):
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self._id = _id

    @staticmethod
    def hash_password(password):
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    def verify_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))    

    def to_dict(self):
        return {
            'username': self.username,
            'email': self.email,
            'password_hash': self.password_hash
        }

    @classmethod
    def from_dict(cls, data):
        return cls(
            username=data.get('username'),
            email=data.get('email'),
            password_hash=data.get('password_hash'),
            _id=data.get('_id')
        )

    def save(self):
        user_data = self.to_dict()
        result = users_collection.insert_one(user_data)
        self._id = result.inserted_id
        return self

    @classmethod
    def find_by_email(cls, email):
        user_data = users_collection.find_one({'email': email})
        if user_data:
            return cls.from_dict(user_data)
        return None

    @classmethod
    def find_by_username(cls, username):
        user_data = users_collection.find_one({'username': username})
        if user_data:
            return cls.from_dict(user_data)
        return None

    @classmethod
    def find_by_id(cls, user_id):
        user_data = users_collection.find_one({'_id': ObjectId(user_id)})
        if user_data:
            return cls.from_dict(user_data)
        return None

