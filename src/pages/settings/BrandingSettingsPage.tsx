import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Field, FieldGrid } from '../../components/forms/Field';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ImageUploader } from '../../components/forms/ImageUploader';
import { useToast } from '../../context/ToastContext';
import { hexColorError } from '../../lib/fieldRules';

const PRESET = { navy: '#1E2461', orange: '#E85D26', gold: '#C8820A', teal: '#006D77' };

type ColorKey = keyof typeof PRESET;

const COLOR_LABELS: Record<ColorKey, string> = {
  navy: 'Navy',
  orange: 'Orange',
  gold: 'Gold',
  teal: 'Teal',
};

export default function BrandingSettingsPage() {
  const [colors, setColors] = useState<Record<ColorKey, string>>(PRESET);
  const [logo, setLogo] = useState<string | undefined>(undefined);
  const [touched, setTouched] = useState<Partial<Record<ColorKey, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  /*
   * Each swatch and the text box beside it write the same value. The picker can
   * only ever produce a valid #rrggbb, the text box accepted anything - so
   * typing 'red' left the swatch silently tracking nothing and saved junk as a
   * brand token.
   */
  const errors = useMemo((): Record<ColorKey, string | null> => {
    const result = {} as Record<ColorKey, string | null>;
    (Object.keys(PRESET) as ColorKey[]).forEach((key) => {
      result[key] = hexColorError(colors[key], COLOR_LABELS[key]);
    });
    return result;
  }, [colors]);

  const hasErrors = Object.values(errors).some(Boolean);
  const touch = (key: ColorKey) => setTouched((t) => ({ ...t, [key]: true }));
  const errorFor = (key: ColorKey): string | undefined =>
    submitted || touched[key] ? (errors[key] ?? undefined) : undefined;

  /** The picker only accepts #rrggbb, so a valid short form is expanded for it. */
  const pickerValue = (key: ColorKey): string => {
    const value = colors[key].trim();
    if (errors[key]) return '#000000';
    return value.length === 4
      ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`
      : value;
  };

  const setColor = (key: ColorKey, value: string) => setColors((c) => ({ ...c, [key]: value }));

  const save = () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    // Normalised on save, so '#E85D26' and '#e85d26' are not two tokens.
    setColors((c) => {
      const next = { ...c };
      (Object.keys(next) as ColorKey[]).forEach((key) => { next[key] = next[key].trim().toLowerCase(); });
      return next;
    });
    toast.success('Saved');
  };

  return (
    <>
      <PageHeader title="Branding"
        actions={
          <Button variant="orange" leftIcon={<Save className="w-4 h-4" />} disabled={submitted && hasErrors} onClick={save}>
            Save
          </Button>
        }
      />
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader title="Logo" />
          <CardBody className="space-y-3">
            {/*
              This was a "Logo URL" text box feeding an <img src> straight from
              whatever was typed. Images in this panel are uploaded, never pasted
              as a URL, so it is an upload slot - which also means the file is
              checked for type, size and readability before it is accepted.
            */}
            <ImageUploader value={logo} onChange={setLogo} label="Logo" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Colors" subtitle="Brand palette tokens" />
          <CardBody>
            <FieldGrid>
              {(Object.keys(PRESET) as ColorKey[]).map((key) => (
                <Field
                  key={key}
                  label={COLOR_LABELS[key]}
                  required
                  error={errorFor(key)}
                  hint="A hex colour such as #1e2461."
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={pickerValue(key)}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="h-9 w-12 rounded border hairline cursor-pointer"
                      aria-label={`${COLOR_LABELS[key]} colour picker`}
                    />
                    <Input
                      value={colors[key]}
                      invalid={!!errorFor(key)}
                      aria-invalid={!!errorFor(key)}
                      onBlur={() => touch(key)}
                      onChange={(e) => setColor(key, e.target.value)}
                    />
                  </div>
                </Field>
              ))}
            </FieldGrid>
            {submitted && hasErrors && (
              <p className="mt-3 text-xs text-orange-700 dark:text-orange-400">
                Fix the highlighted fields above to continue.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
