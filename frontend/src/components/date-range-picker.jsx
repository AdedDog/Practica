import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldLabel } from "@/components/ui/field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn, dateRangeFromIso, toIsoDate } from "@/lib/utils"

const DATE_LABEL_FMT = "d MMM y"

function formatRangeLabel(startDate, endDate) {
  const range = dateRangeFromIso(startDate, endDate)
  if (!range?.from) {
    return "Выберите период"
  }
  const fromLabel = format(range.from, DATE_LABEL_FMT, { locale: ru })
  if (!range.to) {
    return fromLabel
  }
  const toLabel = format(range.to, DATE_LABEL_FMT, { locale: ru })
  return `${fromLabel} — ${toLabel}`
}

export function DateRangePicker({
  id,
  label = "Период",
  startDate = "",
  endDate = "",
  onChange,
  className,
  disabled = false,
}) {
  const selected = dateRangeFromIso(startDate, endDate)

  return (
    <Field className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            disabled={disabled}
            className={cn(
              "w-full justify-start px-2.5 font-normal",
              !startDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="size-4 shrink-0" />
            {formatRangeLabel(startDate, endDate)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={selected?.from}
            selected={selected}
            onSelect={(range) => {
              onChange({
                start_date: range?.from ? toIsoDate(range.from) : "",
                end_date: range?.to ? toIsoDate(range.to) : "",
              })
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </Field>
  )
}
