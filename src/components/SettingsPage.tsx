import { useSettingsStore, Density, DefaultSort, Theme } from "../settingsStore";
import { Priority } from "../store";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-8 h-4 rounded-full transition-colors shrink-0"
      style={{ background: value ? "rgba(99,179,237,0.5)" : "var(--c-surface-3)" }}
    >
      <span
        className="absolute top-0.5 w-3 h-3 rounded-full transition-transform"
        style={{
          background: value ? "rgb(147,210,255)" : "var(--c-text-3)",
          transform: value ? "translateX(17px)" : "translateX(2px)",
        }}
      />
    </button>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="flex gap-0.5 p-0.5 rounded-lg"
      style={{ background: "var(--c-surface-2)" }}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-2 py-0.5 rounded-md text-[11px] transition-colors ${
            value === opt.value
              ? "text-t1"
              : "text-t4 hover:text-t3"
          }`}
          style={value === opt.value ? { background: "var(--c-surface-3)" } : {}}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] text-t2">{label}</p>
        {hint && <p className="text-[11px] text-t4 mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <p className="px-4 pb-1.5 text-[10px] text-t4 uppercase tracking-widest select-none">{title}</p>
      <div className="rounded-xl overflow-hidden mx-1" style={{ background: "var(--c-surface-1)" }}>
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px mx-4" style={{ background: "var(--c-border-subtle)" }} />;
}

export default function SettingsPage() {
  const { theme, density, confirmDelete, defaultPriority, defaultSort, showDoneAtBottom, showDividers, reminderInterval, set, reset } = useSettingsStore();

  return (
    <div className="view-animate overflow-y-auto flex-1 py-3">
      <Section title="Appearance">
        <Row label="Theme" hint="Switch between dark and light appearance">
          <SegmentedControl<Theme>
            options={[
              { value: "dark", label: "Dark" },
              { value: "light", label: "Light" },
            ]}
            value={theme}
            onChange={(v) => set("theme", v)}
          />
        </Row>
        <Divider />
        <Row label="Row density" hint="Spacing between tasks">
          <SegmentedControl<Density>
            options={[
              { value: "compact", label: "Compact" },
              { value: "normal", label: "Normal" },
              { value: "comfortable", label: "Roomy" },
            ]}
            value={density}
            onChange={(v) => set("density", v)}
          />
        </Row>
        <Divider />
        <Row label="Dividers between tasks" hint="Show a soft line separating each task">
          <Toggle value={showDividers} onChange={(v) => set("showDividers", v)} />
        </Row>
      </Section>

      <Section title="Tasks">
        <Row label="Default priority" hint="Priority assigned to new tasks">
          <SegmentedControl<Priority>
            options={[
              { value: "none", label: "None" },
              { value: "low", label: "Low" },
              { value: "medium", label: "Med" },
              { value: "high", label: "High" },
            ]}
            value={defaultPriority}
            onChange={(v) => set("defaultPriority", v)}
          />
        </Row>
        <Divider />
        <Row label="Default sort" hint="How new tasks are ordered">
          <SegmentedControl<DefaultSort>
            options={[
              { value: "manual", label: "Manual" },
              { value: "due", label: "Due" },
              { value: "priority", label: "Priority" },
              { value: "az", label: "A–Z" },
            ]}
            value={defaultSort}
            onChange={(v) => set("defaultSort", v)}
          />
        </Row>
        <Divider />
        <Row label="Done tasks at bottom" hint="Separate completed tasks visually">
          <Toggle value={showDoneAtBottom} onChange={(v) => set("showDoneAtBottom", v)} />
        </Row>
      </Section>

      <Section title="Behavior">
        <Row label="Confirm before delete" hint="Show a confirmation dialog on delete">
          <Toggle value={confirmDelete} onChange={(v) => set("confirmDelete", v)} />
        </Row>
        <Divider />
        <Row label="Reminder check interval" hint="How often to check for due reminders">
          <SegmentedControl<string>
            options={[
              { value: "30", label: "30s" },
              { value: "60", label: "1m" },
              { value: "300", label: "5m" },
            ]}
            value={String(reminderInterval)}
            onChange={(v) => set("reminderInterval", Number(v) as 30 | 60 | 300)}
          />
        </Row>
      </Section>

      <Section title="Data">
        <Divider />
        <Row label="Reset all settings" hint="Restore defaults">
          <button
            onClick={reset}
            className="px-3 py-1 rounded-md text-[11px] text-red-400/60 hover:text-red-400 transition-colors"
            style={{ background: "var(--c-surface-2)" }}
          >
            Reset
          </button>
        </Row>
      </Section>

      <p className="text-center text-[10px] text-t6 pb-2 select-none">Slate · settings are saved locally</p>
    </div>
  );
}
