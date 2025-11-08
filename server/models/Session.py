from pymongo import MongoClient
from config import Config
from datetime import datetime, timedelta
from bson import ObjectId

client = MongoClient(Config.MONGO_URI)
db = client.get_database("level_up")
sessions_collection = db.sessions

class Session:
    def __init__(self,user_id, username, date, time_started, total_hours, intervals, time_per_interval, time_hair, time_nail, time_eye, time_nose, time_unfocused, time_paused, _id=None):
        self.user_id = user_id
        self.username = username
        self.date = date
        self.time_started = time_started
        self.total_hours = total_hours
        self.intervals = intervals
        self.time_per_interval = time_per_interval
        self.time_hair = time_hair
        self.time_nail = time_nail
        self.time_eye = time_eye
        self.time_nose = time_nose
        self.time_unfocused = time_unfocused
        self.time_paused = time_paused
        self._id = _id


    @classmethod
    def from_dict(cls, data):
        return cls(
            user_id=data.get('user_id'),
            username=data.get('username'),
            date=data.get('date'),
            time_started=data.get('time_started'),
            total_hours=data.get('total_hours'),
            intervals=data.get('intervals'),
            time_per_interval=data.get('time_per_interval'),
            time_hair=data.get('time_hair'),
            time_nail=data.get('time_nail'),
            time_eye=data.get('time_eye'),
            time_nose=data.get('time_nose'),
            time_unfocused=data.get('time_unfocused'),
            time_paused=data.get('time_paused'),
            _id=data.get('_id')
        )

    def to_dict(self):
        return {
            'user_id': self.user_id,
            'username': self.username,
            'date': self.date,
            'time_started': self.time_started,
            'total_hours': self.total_hours,
            'intervals': self.intervals,
            'time_per_interval': self.time_per_interval,
            'time_hair': self.time_hair,
            'time_nail': self.time_nail,
            'time_eye': self.time_eye,
            'time_nose': self.time_nose,
            'time_unfocused': self.time_unfocused,
            'time_paused': self.time_paused
    }

    def save(self):
        session_data = self.to_dict()
        result = sessions_collection.insert_one(session_data)
        self._id = result.inserted_id
        return self

    def update(self):
        if not self._id:
            raise ValueError("Cannot update - session doesn't have _id")

        sessions_collection.update_one(
            {'_id': self._id},
            {'$set': self.to_dict()}
        )
        return self

    @classmethod
    def find_by_id(cls, record_id):
        data = sessions_collection.find_one({'_id': ObjectId(record_id)})
        if data:
            return cls.from_dict(data)
        return None

    @classmethod
    def find_by_user_id(cls, user_id):
        records = sessions_collection.find({'user_id': user_id})
        return [cls.from_dict(record) for record in records]

    @classmethod
    def find_by_username(cls, username):

        records = sessions_collection.find({'username': username})
        return [cls.from_dict(record) for record in records]

    @classmethod
    def get_user_sessions_in_date_range(cls, user_id, start_date, end_date):
        query = {
            'user_id': user_id,
            'date': {'$gte': start_date, '$lte': end_date}
        }
        records = sessions_collection.find(query).sort('date', 1)  # Sort by date ascending
        return [cls.from_dict(record) for record in records]

    @classmethod
    def get_recent_sessions(cls, user_id, limit=10):
        records = sessions_collection.find({'user_id': user_id})\
                                .sort('date', -1)\
                                .limit(limit)
        return [cls.from_dict(record) for record in records]