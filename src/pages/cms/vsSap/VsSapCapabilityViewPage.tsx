import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardBody, CardHeader } from '../../../components/ui/Card';
import {
  ContentStatusPill,
  ReadOnlyField,
  RecordDates,
  ViewHeader,
  ViewLoadError,
  ViewSkeleton,
  useRecord,
} from '../../../components/common/RecordView';
import { editRequestState } from '../../../hooks/useEditRequest';
import * as capabilitiesService from '../../../services/vsSapCapabilitiesService';
import { RATED_PRODUCTS, ratingLabel } from './vsSapForm';
import { RatingStars } from './RatingStars';

/**
 * Resource Page -> UpWon vs SAP -> Capability Comparison: one row of the
 * capability table, read-only - the eye action on the table
 * (VsSapComparisonPage) opens it.
 *
 * Shows the row's label, its three ratings drawn the way the site draws them
 * (stars, or a dash for "not available natively") beside the words the edit
 * dialog uses for each, and the row as it reads in the table on
 * /compare/upwon-vs-sap. A row is edited in the dialog on its tab rather than on
 * a page of its own, so Edit goes back to the tab and opens that dialog on this
 * row (see hooks/useEditRequest).
 */

const LIST_PATH = '/cms/resources/upwon-vs-sap/comparison';

export default function VsSapCapabilityViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { record: row, error } = useRecord(id, capabilitiesService.getById);

  if (error) {
    return (
      <ViewLoadError
        title="Capability"
        message={error}
        backTo={LIST_PATH}
        backLabel="Back to the capability table"
      />
    );
  }
  if (!row) return <ViewSkeleton />;

  return (
    <>
      <ViewHeader
        eyebrow={<ContentStatusPill status={row.status} />}
        title="View capability"
        description="Read-only. Use Edit to change this capability."
        backTo={LIST_PATH}
        onEdit={() => navigate(LIST_PATH, { state: editRequestState(row.id) })}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr,360px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Capability"
              subtitle="One row of the capability table on the public /compare/upwon-vs-sap page."
            />
            <CardBody className="space-y-5">
              <ReadOnlyField
                label="Capability"
                value={row.capability}
                hint="The row's label, in the table's first column."
              />
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                {RATED_PRODUCTS.map((product) => (
                  <ReadOnlyField key={product.key} label={product.label}>
                    <div className="space-y-1">
                      <RatingStars rating={row[product.key]} />
                      <p className="text-sm text-charcoal dark:text-cream-100">
                        {ratingLabel(row[product.key])}
                      </p>
                    </div>
                  </ReadOnlyField>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Preview" subtitle="How this row reads in the table on the site." />
            <CardBody>
              <div className="overflow-x-auto">
                <div className="min-w-[520px] overflow-hidden rounded-lg border border-cream-300 dark:border-navy-800">
                  <div className="grid grid-cols-[minmax(0,1.6fr),repeat(3,minmax(0,1fr))] text-center">
                    <p className="bg-navy-950 px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
                      Capability
                    </p>
                    {RATED_PRODUCTS.map((product) => (
                      <p
                        key={product.key}
                        className={
                          product.key === 'upwon'
                            ? 'bg-orange-500 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white'
                            : 'bg-navy-950 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white'
                        }
                      >
                        {product.label}
                      </p>
                    ))}
                    <p className="break-words bg-white px-3 py-3 text-left text-sm font-medium text-charcoal dark:bg-navy-900 dark:text-cream-100">
                      {row.capability}
                    </p>
                    {RATED_PRODUCTS.map((product) => (
                      <div
                        key={product.key}
                        className="flex items-center justify-center bg-white px-2 py-3 dark:bg-navy-900"
                      >
                        <RatingStars rating={row[product.key]} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {row.status !== 'ACTIVE' && (
                <p className="mt-3 text-xs text-charcoal-light dark:text-navy-300">
                  Inactive - this row is kept here but is not on the live table.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Placement" />
            <CardBody className="space-y-4">
              <ReadOnlyField label="Status">
                <ContentStatusPill status={row.status} />
              </ReadOnlyField>
              <ReadOnlyField label="Position in the table" value={String(row.displayOrder + 1)} />
              <RecordDates createdAt={row.createdAt} updatedAt={row.updatedAt} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
