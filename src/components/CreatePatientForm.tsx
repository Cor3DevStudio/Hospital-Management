import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Patient } from "@/lib/store";

export type CreatePatientFormProps = {
  form: Patient;
  onChange: (form: Patient) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel?: string;
};

/** Compact registration form shared by Admission, ER, OPD, and patient search. */
export function CreatePatientForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = "Register Patient",
}: CreatePatientFormProps) {
  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">First Name *</Label>
          <Input
            className="h-9 text-sm"
            value={form.firstName}
            onChange={(e) => onChange({ ...form, firstName: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Last Name *</Label>
          <Input
            className="h-9 text-sm"
            value={form.lastName}
            onChange={(e) => onChange({ ...form, lastName: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Middle Name</Label>
          <Input
            className="h-9 text-sm"
            value={form.middleName ?? ""}
            onChange={(e) => onChange({ ...form, middleName: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Suffix</Label>
          <Input
            className="h-9 text-sm"
            value={form.suffix ?? ""}
            onChange={(e) => onChange({ ...form, suffix: e.target.value })}
            placeholder="Jr., Sr., III"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Date of Birth *</Label>
          <Input
            type="date"
            className="h-9 text-sm"
            value={form.birthDate}
            onChange={(e) => onChange({ ...form, birthDate: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Sex *</Label>
          <Select
            value={form.gender}
            onValueChange={(value) => onChange({ ...form, gender: value as Patient["gender"] })}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Contact Number *</Label>
          <Input
            className="h-9 text-sm"
            value={form.contactNumber}
            onChange={(e) => onChange({ ...form, contactNumber: e.target.value })}
            required
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">PhilHealth PIN</Label>
          <Input
            className="h-9 text-sm"
            value={form.philhealth?.memberNumber ?? ""}
            onChange={(e) =>
              onChange({
                ...form,
                philhealth: { ...form.philhealth, memberNumber: e.target.value },
              })
            }
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Back to Search
        </Button>
        <Button type="submit" size="sm">
          <Save className="h-3.5 w-3.5" /> {submitLabel}
        </Button>
      </div>
    </form>
  );
}
