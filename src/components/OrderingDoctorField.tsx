import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@/lib/store";

type OrderingDoctorFieldProps = {
  value: string;
  onChange: (value: string) => void;
  doctors: User[];
  id?: string;
};

/** Ordering physician — type freely or pick from active doctors. */
export function OrderingDoctorField({
  value,
  onChange,
  doctors,
  id = "ordering-doctors",
}: OrderingDoctorFieldProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">Ordering Doctor</Label>
      <Input
        className="h-9 text-sm"
        list={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          doctors.length ? "Select or type physician name" : "Enter ordering physician name"
        }
      />
      <datalist id={id}>
        {doctors.map((d) => (
          <option key={d.id} value={d.fullName} />
        ))}
      </datalist>
      {doctors.length === 0 && (
        <p className="text-[11px] text-muted-foreground">
          No doctor accounts loaded — enter the ordering physician name manually.
        </p>
      )}
    </div>
  );
}
