import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { runtimeLibraryApi } from '../../../services/runtimeLibrary';
import type { CommunityPolicy, CommunityPreview } from '../../../types/runtimeLibrary';
import { PolicyValidationError } from '../../Dataplane/runtimeHelpers';
import { communityInput, type CommunityDraft } from './model';

/** Invalidates the reviewed preview whenever scope or acknowledgement changes. */
export function useCommunityImport(entry: CommunityPolicy, onImported: (scope: string) => void, onBusy: (busy: boolean) => void) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<CommunityDraft>({ namespace: 'default', name: `community-${entry.title.toLowerCase().replace(/[^a-z0-9.-]+/g, '-')}`, labels: '', acknowledged: false });
  const [preview, setPreview] = useState<CommunityPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const change = (update: Partial<CommunityDraft>) => { setDraft(previous => ({ ...previous, ...update })); setPreview(null); setError(''); };
  const perform = async (importing: boolean) => {
    setBusy(true); onBusy(true); setError('');
    try {
      const input = communityInput(entry.id, draft);
      if (importing && preview) {
        const result = await runtimeLibraryApi.importPolicy({ ...input, preview_sha256: preview.sha256 });
        onImported(`${result.namespace}/${result.name}`);
      } else setPreview(await runtimeLibraryApi.preview(input));
    } catch (reason) {
      setError(reason instanceof PolicyValidationError ? t(`dataplane.validation.${reason.message}`) : reason instanceof Error ? reason.message : String(reason));
    } finally { setBusy(false); onBusy(false); }
  };
  return { draft, preview, busy, error, change, perform };
}
