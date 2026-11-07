import { Card, CardContent, Box, Typography, Chip, Button } from '@mui/material';
import { CategoryChip } from '../Common/StatusChip';
import { colors } from '../../theme/colors';
import type { RuleTemplate } from '../../services/rulesData';
import type { TFunction } from 'i18next';

interface TemplateCardProps {
  template: RuleTemplate;
  onApply: (id: string) => void;
  t: TFunction;
}

export function TemplateCard({ template, onApply, t }: TemplateCardProps) {
  return (
    <Card
      sx={{
        height: '100%',
        cursor: 'pointer',
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          borderColor: colors.primary.main,
          boxShadow: '0 4px 12px rgba(22, 93, 255, 0.15)',
          transform: 'translateY(-2px)',
        },
      }}
      onClick={() => onApply(template.id)}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="600">{template.name}</Typography>
            <CategoryChip category={template.category} sx={{ mt: 0.5 }} />
          </Box>
          <Button
            size="small"
            variant="contained"
            sx={{ borderRadius: 2 }}
            onClick={(e) => {
              e.stopPropagation();
              onApply(template.id);
            }}
          >
            {t('rules.buttons.apply')}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, minHeight: 40 }}>
          {template.description}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {template.tags.slice(0, 3).map((tag: string) => (
            <Chip key={tag} label={tag} size="small" variant="outlined" sx={{ fontSize: 11, height: 22 }} />
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
