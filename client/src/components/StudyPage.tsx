import FocusAndHabits from "./FocusAndHabits";

export default function StudyPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Study Focus</h1>
      <FocusAndHabits onResume={()=>{}} onEndSession={()=>{}} />
    </div>
  );
}