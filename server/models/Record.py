from pymongo import MongoClient
from config import Config
from datetime import datetime, timedelta
from bson import ObjectId

client = MongoClient(Config.MONGO_URI)
db = client.get_database("level_up")
records_collection = db.records


class Record:
    def __init__(
        self,
        user_id,
        username,
        total_sessions,
        total_hours,
        total_intervals,
        time_hair,
        time_nail,
        time_eye,
        time_nose,
        time_unfocused,
        time_paused,
        _id=None
    ):
        self.user_id = user_id
        self.username = username
        self.total_sessions = total_sessions
        self.total_hours = total_hours
        self.total_intervals = total_intervals
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
            total_sessions=data.get('total_sessions'),
            total_hours=data.get('total_hours'),
            total_intervals=data.get('total_intervals'),
            time_hair=data.get('time_hair'),
            time_nail=data.get('time_nail'),
            time_eye=data.get('time_eye'),
            time_nose=data.get('time_nose'),
            time_unfocused=data.get('time_unfocused'),
            time_paused=data.get('time_paused'),
            _id=data.get('_id')
        )

    def to_dict(self):
        # Helper to clean up float formatting
        def clean_float(value):
            if isinstance(value, float):
                # Round to 2 decimal places and remove binary float artifacts
                return float(f"{round(value, 2):.2f}")
            return value

        return {
            'user_id': str(self.user_id),
            'username': self.username,
            'total_sessions': self.total_sessions,
            'total_hours': clean_float(self.total_hours),
            'total_intervals': self.total_intervals,
            'time_hair': clean_float(self.time_hair),
            'time_nail': clean_float(self.time_nail),
            'time_eye': clean_float(self.time_eye),
            'time_nose': clean_float(self.time_nose),
            'time_unfocused': clean_float(self.time_unfocused),
            'time_paused': clean_float(self.time_paused)
        }

    def save(self):
        record_data = self.to_dict()
        result = records_collection.insert_one(record_data)
        self._id = result.inserted_id
        return self

    @classmethod
    def find_by_user_id(cls, user_id):
        data = records_collection.find_one({"user_id": user_id})
        if data:
            return cls.from_dict(data)
        return None

    def update(self):
        record_data = self.to_dict()
        records_collection.update_one(
            {'_id': ObjectId(self._id)},
            {'$set': record_data}
        )
        return self

    @classmethod
    def find_by_id(cls, record_id):
        data = records_collection.find_one({'_id': ObjectId(record_id)})
        if data:
            return cls.from_dict(data)
        return None

    def increment_sessions(
        self,
        hours,
        intervals,
        time_hair,
        time_nail,
        time_eye,
        time_nose,
        time_unfocused,
        time_paused
    ):
        self.total_sessions += 1
        self.total_hours += hours
        self.total_intervals += intervals
        self.time_hair += round((time_hair / 3600), 2)
        self.time_nail += round((time_nail / 3600), 2)
        self.time_eye += round((time_eye / 3600), 2)
        self.time_nose += round((time_nose / 3600), 2)
        self.time_unfocused += round((time_unfocused / 3600), 2)
        self.time_paused += round((time_paused / 3600), 2)
        self.update()
        return self