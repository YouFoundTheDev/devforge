import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  makeStyles,
  Typography,
} from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(3),
  },
  hero: {
    background: 'linear-gradient(120deg, #101828 0%, #182b4d 100%)',
    borderRadius: theme.spacing(1),
    color: '#fff',
    padding: theme.spacing(4),
  },
  eyebrow: {
    color: '#9cc7ff',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontWeight: 700,
    marginTop: theme.spacing(1),
    maxWidth: 720,
  },
  heroDescription: {
    color: '#d0d5dd',
    margin: theme.spacing(1.5, 0, 3),
    maxWidth: 720,
  },
  metrics: {
    height: '100%',
  },
  metricValue: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  metricLabel: {
    fontWeight: 600,
  },
  metricCaption: {
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },
  sectionTitle: {
    fontWeight: 700,
    marginBottom: theme.spacing(1.5),
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
  },
}));

interface Metric {
  label: string;
  value: string;
  caption: string;
  tone?: 'good' | 'warning' | 'critical';
}

const metricColors: Record<NonNullable<Metric['tone']>, string> = {
  good: '#16803c',
  warning: '#b54708',
  critical: '#b42318',
};

const serviceMetrics: Metric[] = [
  { label: 'Services', value: '12', caption: 'Registered in the catalog' },
  { label: 'Healthy', value: '10', caption: 'Operating normally', tone: 'good' },
  { label: 'Degraded', value: '1', caption: 'Needs attention', tone: 'warning' },
  { label: 'Critical', value: '1', caption: 'Requires action', tone: 'critical' },
];

const deliveryMetrics: Metric[] = [
  { label: 'CI success rate', value: '96%', caption: 'Across recent builds' },
  { label: 'Security compliance', value: '92%', caption: 'Passing baseline checks' },
  { label: 'Documentation coverage', value: '88%', caption: 'Services with TechDocs' },
];

function MetricCard({ metric }: { metric: Metric }) {
  const classes = useStyles();
  const color = metric.tone ? metricColors[metric.tone] : undefined;

  return (
    <Card className={classes.metrics} variant="outlined">
      <CardContent>
        <Typography className={classes.metricLabel} color="textSecondary">
          {metric.label}
        </Typography>
        <Typography className={classes.metricValue} style={{ color }}>
          {metric.value}
        </Typography>
        <Typography className={classes.metricCaption} variant="body2">
          {metric.caption}
        </Typography>
      </CardContent>
    </Card>
  );
}

export function DevForgeDashboard() {
  const classes = useStyles();

  return (
    <Box className={classes.root}>
      <Box className={classes.hero}>
        <Chip
          className={classes.eyebrow}
          label="Internal Developer Platform"
          size="small"
          variant="outlined"
        />
        <Typography className={classes.heroTitle} variant="h4">
          Secure service delivery, on one paved road.
        </Typography>
        <Typography className={classes.heroDescription} variant="body1">
          Discover owned services, ship from a production-ready template, and
          see delivery health across the DevForge platform.
        </Typography>
        <Box className={classes.actions}>
          <Button
            component={RouterLink}
            to="/create"
            color="primary"
            variant="contained"
          >
            Create Service
          </Button>
          <Button
            component={RouterLink}
            to="/catalog?filters[kind]=component"
            variant="outlined"
            style={{ borderColor: '#98a2b3', color: '#fff' }}
          >
            Explore Services
          </Button>
        </Box>
      </Box>

      <Box>
        <Typography className={classes.sectionTitle} variant="h6">
          Service posture
        </Typography>
        <Grid container spacing={2}>
          {serviceMetrics.map(metric => (
            <Grid item key={metric.label} xs={12} sm={6} md={3}>
              <MetricCard metric={metric} />
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box>
        <Typography className={classes.sectionTitle} variant="h6">
          Delivery standards
        </Typography>
        <Grid container spacing={2}>
          {deliveryMetrics.map(metric => (
            <Grid item key={metric.label} xs={12} sm={6} md={4}>
              <MetricCard metric={metric} />
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box className={classes.actions}>
        <Button
          component={RouterLink}
          to="/catalog/default/system/devforge-platform"
          color="primary"
          variant="outlined"
        >
          Platform Health
        </Button>
        <Button
          component={RouterLink}
          to="/catalog/default/component/threat-intel-api/docs"
          color="primary"
          variant="outlined"
        >
          Documentation
        </Button>
      </Box>
    </Box>
  );
}
