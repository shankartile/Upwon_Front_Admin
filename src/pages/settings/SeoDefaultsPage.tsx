import { useState } from 'react';
import { Save } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import { SeoFields } from '../../components/forms/SeoFields';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import type { Seo } from '../../types';

export default function SeoDefaultsPage() {
  const [seo, setSeo] = useState<Seo>({
    title: 'Upwon — Enterprise platform',
    description: 'Run your business on a single platform — finance, ops, people, revenue.',
    keywords: ['ERP', 'platform', 'India'],
  });
  const toast = useToast();
  return (
    <>
      <PageHeader title="SEO Defaults"
        actions={<Button variant="orange" leftIcon={<Save className="w-4 h-4" />} onClick={() => toast.success('Saved')}>Save</Button>}
      />
      <Card>
        <CardBody><SeoFields value={seo} onChange={setSeo} /></CardBody>
      </Card>
    </>
  );
}
