import { Autocomplete, Box, Chip, InputAdornment, TextField } from '@mui/material';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HubbleIcon } from './HubbleIcon';
import { flowFilterKey, formatFlowFilter, parseFlowFilter, uniqueFlowFilters, type FlowFilter } from './flowFilters';

interface FlowsFilterInputProps {
  filters: FlowFilter[];
  suggestions: string[];
  onChange: (filters: FlowFilter[]) => void;
}

export function FlowsFilterInput({ filters, suggestions, onChange }: FlowsFilterInputProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const value = useMemo(() => filters.map(formatFlowFilter), [filters]);
  const options = useMemo(() => {
    const match = input.match(/^(!)?(?:(from|to|either):)?(.*)$/);
    const prefix = `${match?.[1] ?? ''}${match?.[2] ? `${match[2]}:` : ''}`;
    const query = (match?.[3] ?? '').toLowerCase().replace(/^label=k8s:/, 'label=');
    const matches = suggestions.filter(suggestion => suggestion.toLowerCase().includes(query)).slice(0, 100)
      .map(suggestion => `${prefix}${suggestion}`);
    const custom = parseFlowFilter(input);
    if (custom && !matches.some(option => flowFilterKey(parseFlowFilter(option)!) === flowFilterKey(custom))) matches.push(formatFlowFilter(custom));
    return matches;
  }, [input, suggestions]);

  return <Autocomplete<string, true, false, true>
    multiple freeSolo size="small" filterSelectedOptions clearOnBlur={false}
    options={options} value={value} inputValue={input}
    filterOptions={options => options}
    onInputChange={(_, text) => setInput(text)}
    onChange={(_, values) => {
      onChange(uniqueFlowFilters(values.map(parseFlowFilter).filter((filter): filter is FlowFilter => !!filter)));
      setInput('');
    }}
    clearText={t('topology.filters.clear')} openText={t('topology.filters.open')} closeText={t('common.close')}
    noOptionsText={t('topology.filters.noSuggestions')}
    slotProps={{ clearIndicator: { sx: { visibility: 'visible' } } }}
    sx={{ flex: '1 1 280px', minWidth: 180, maxWidth: 720,
      '& .MuiAutocomplete-inputRoot': { py: '2px !important' },
      '& .MuiAutocomplete-input': { minWidth: '100px !important' },
    }}
    renderValue={(values, getItemProps) => values.map((value, index) => {
      const { key, ...itemProps } = getItemProps({ index });
      const filter = parseFlowFilter(value)!;
      return <Chip key={key} {...itemProps} size="small" title={value}
        label={<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <Box component="span" sx={{ fontSize: 10, color: filter.direction === 'from' ? 'success.main' : 'info.main' }}>
            {filter.direction === 'either' ? 'from ↔ to' : filter.direction === 'from' ? 'from →' : '→ to'}
          </Box>
          <span>{formatFlowFilter({ ...filter, direction: 'either' })}</span>
        </Box>}
        sx={{ height: 24, maxWidth: 320, borderRadius: '3px', fontSize: 12 }} />;
    })}
    renderInput={params => <TextField {...params} placeholder={t('topology.filterPlaceholder')}
      slotProps={{
        htmlInput: { ...params.inputProps, 'aria-label': t('topology.filters.label') },
        input: { ...params.InputProps, startAdornment: <><InputAdornment position="start"><HubbleIcon name="search" sx={{ fontSize: 16 }} /></InputAdornment>{params.InputProps.startAdornment}</> },
      }} />}
  />;
}
