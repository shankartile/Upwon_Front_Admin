import { useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { SeoFields, hasSeoErrors } from '../../components/forms/SeoFields';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import type { Seo } from '../../types';

export default function SeoDefaultsPage() {
  const [seo, setSeo] = useState<Seo>({
    title: 'Upwon — Enterprise platform',
    description: 'Run your business on a single platform — finance, ops, people, revenue.',
    keywords: ['ERP', 'platform', 'India'],
  });
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  // The rules themselves live with the fields, in components/forms/SeoFields,
  // so this screen and the three editors that embed the same block enforce one
  // set of limits rather than four.
  const hasErrors = hasSeoErrors(seo);

  const save = () => {
    setSubmitted(true);
    if (hasErrors) {
      toast.error('Check the highlighted fields');
      return;
    }
    toast.success('Saved');
  };

  return (
    <>
      <PageHeader title="SEO Defaults"
        actions={
          <Button variant="orange" leftIcon={<Save className="w-4 h-4" />} disabled={submitted && hasErrors} onClick={save}>
            Save
          </Button>
        }
      />
      <Card>
        <CardBody className="space-y-4">
          <SeoFields value={seo} onChange={setSeo} submitted={submitted} />
          {submitted && hasErrors && (
            <p className="text-xs text-orange-700 dark:text-orange-400">
              Fix the highlighted fields above to continue.
            </p>
          )}
        </CardBody>
      </Card>
    </>
  );
}
