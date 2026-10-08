import {
  Box,
  Button,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import { InfoCard, Progress } from '@backstage/core-components';
import type { ServiceHealthResponse } from '@internal/plugin-service-health-common';

interface ServiceHealthViewProps {
  health: ServiceHealthResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function statusColor(status: string): 'primary' | 'secondary' | 'default' {
  if (status === 'HEALTHY' || status === 'PASSING' || status === 'COMPLETE') {
    return 'primary';
  }
  if (status === 'CRITICAL' || status === 'FAILING' || status === 'UNHEALTHY') {
    return 'secondary';
  }
  return 'default';
}

function StatusChip({ status }: { status: string }) {
  return <Chip size="small" color={statusColor(status)} label={status} />;
}

export function ServiceHealthView({
  health,
  loading,
  error,
  onRetry,
}: ServiceHealthViewProps) {
  if (loading) {
    return <Progress />;
  }

  if (error) {
    return (
      <InfoCard title="Service Health">
        <Typography color="error" role="alert">
          {error}
        </Typography>
        <Box mt={2}>
          <Button color="primary" onClick={onRetry} variant="outlined">
            Retry
          </Button>
        </Box>
      </InfoCard>
    );
  }

  if (!health) {
    return (
      <InfoCard title="Service Health">
        <Typography>No health data is available for this service.</Typography>
      </InfoCard>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <InfoCard title="Service Health">
          <Box display="flex" alignItems="center" gridGap={12}>
            <StatusChip status={health.status} />
            <Chip
              size="small"
              variant="outlined"
              label={health.dataSource === 'demo' ? 'MOCK DATA' : 'LIVE DATA'}
            />
            <Typography variant="h4">
              {health.score === null ? 'N/A' : `${health.score}/100`}
            </Typography>
          </Box>
          <Box mt={2}>
            <Typography>
              Version: {health.deployment.version ?? 'Unavailable'}
            </Typography>
            <Typography>
              Environment: {health.deployment.environment ?? 'Unavailable'}
            </Typography>
            <Typography>
              Last deployment:{' '}
              {health.deployment.lastDeployment ?? 'Unavailable'}
            </Typography>
          </Box>
          {health.sourceErrors.length > 0 && (
            <Box mt={2} role="alert">
              {health.sourceErrors.map(sourceError => (
                <Typography color="error" key={sourceError.provider}>
                  {sourceError.message}
                </Typography>
              ))}
            </Box>
          )}
        </InfoCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <InfoCard title="CI and Deployment">
          <Typography component="div">
            CI: <StatusChip status={health.ci.status} />
          </Typography>
          <Typography component="div">
            Deployment: <StatusChip status={health.deployment.status} />
          </Typography>
          <Typography>
            Last CI run: {health.ci.lastRun ?? 'Unavailable'}
          </Typography>
        </InfoCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <InfoCard title="Security">
          <Typography component="div">
            Status: <StatusChip status={health.security.status} />
          </Typography>
          <Typography>
            Score:{' '}
            {health.security.score === null
              ? 'Unavailable'
              : `${health.security.score}/100`}
          </Typography>
          <Typography>
            Critical: {health.security.findings.critical ?? 'Unavailable'} ·
            High: {health.security.findings.high ?? 'Unavailable'} · Medium:{' '}
            {health.security.findings.medium ?? 'Unavailable'} · Secrets:{' '}
            {health.security.findings.secrets ?? 'Unavailable'}
          </Typography>
          <Typography>SAST: {health.security.sast}</Typography>
          <Typography>
            Container scan: {health.security.containerScan}
          </Typography>
        </InfoCard>
      </Grid>

      <Grid item xs={12} md={6}>
        <InfoCard title="Documentation and Dependencies">
          <Typography component="div">
            Documentation: <StatusChip status={health.documentation.status} />
          </Typography>
          <Box mt={2}>
            <Typography variant="subtitle2">Dependencies</Typography>
            {health.dependencies.length === 0 ? (
              <Typography>No dependencies are registered.</Typography>
            ) : (
              <Table size="small" aria-label="Service dependencies">
                <TableHead>
                  <TableRow>
                    <TableCell>Dependency</TableCell>
                    <TableCell align="right">Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {health.dependencies.map(dependency => (
                    <TableRow key={dependency.entityRef}>
                      <TableCell>{dependency.name}</TableCell>
                      <TableCell align="right">
                        <StatusChip status={dependency.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>
        </InfoCard>
      </Grid>

      <Grid item xs={12}>
        <InfoCard title="Recent Deployments">
          {health.deployment.recentDeployments.length === 0 ? (
            <Typography>No recent deployments are available.</Typography>
          ) : (
            <Table size="small" aria-label="Recent deployments">
              <TableHead>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {health.deployment.recentDeployments.map(deployment => (
                  <TableRow key={deployment.version}>
                    <TableCell>{deployment.version}</TableCell>
                    <TableCell>
                      <StatusChip status={deployment.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </InfoCard>
      </Grid>
    </Grid>
  );
}
