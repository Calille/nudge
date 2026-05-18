import { Select } from "@/components/shared/Input";
import { UK_COUNTIES, type UKCounty } from "@/lib/uk-counties";

interface Props {
  value: UKCounty | null;
  onChange: (value: UKCounty | null) => void;
  label?: string;
  hint?: string;
  includeAnyOption?: boolean;
}

export function AreaSelect({
  value,
  onChange,
  label = "Area",
  hint,
  includeAnyOption,
}: Props) {
  return (
    <Select
      label={label}
      hint={hint}
      value={value ?? ""}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === "" ? null : (v as UKCounty));
      }}
    >
      <option value="">
        {includeAnyOption ? "Any area" : "— Select area —"}
      </option>
      {UK_COUNTIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Select>
  );
}
