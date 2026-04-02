"use client";

export default function ProfessorPills({
  professors,
  selected,
  onSelect,
}: {
  professors: string[];
  selected: string | null;
  onSelect: (name: string | null) => void;
}) {
  if (professors.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 overflow-x-auto">
      <button
        onClick={() => onSelect(null)}
        className={`brutal-tag text-[10px] cursor-pointer transition-colors ${
          !selected ? "brutal-tag-filled" : ""
        }`}
      >
        ALL
      </button>
      {professors.map((name) => (
        <button
          key={name}
          onClick={() => onSelect(selected === name ? null : name)}
          className={`brutal-tag text-[10px] cursor-pointer transition-colors ${
            selected === name ? "brutal-tag-filled" : ""
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
