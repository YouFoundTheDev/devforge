import { readFile } from 'node:fs/promises';
import type {
  CatalogProcessor,
  CatalogProcessorParser,
} from '@backstage/plugin-catalog-node';
import { processingResult } from '@backstage/plugin-catalog-node';
import {
  LOCAL_CATALOG_LOCATION_TYPE,
  parseLocalCatalogTarget,
  resolveLocalDescriptorPath,
} from './actions/registerLocal';

export class DevForgeLocalCatalogProcessor implements CatalogProcessor {
  constructor(private readonly generatedServicesPath: string) {}

  getProcessorName(): string {
    return 'DevForgeLocalCatalogProcessor';
  }

  async readLocation(
    location: { type: string; target: string },
    _optional: boolean,
    emit: Parameters<NonNullable<CatalogProcessor['readLocation']>>[2],
    parser: CatalogProcessorParser,
  ): Promise<boolean> {
    if (location.type !== LOCAL_CATALOG_LOCATION_TYPE) {
      return false;
    }

    const parsedTarget = parseLocalCatalogTarget(location.target);
    if (!parsedTarget) {
      emit(
        processingResult.inputError(
          location,
          'DevForge catalog locations must reference a generated catalog descriptor.',
        ),
      );
      return true;
    }

    const descriptorPath = resolveLocalDescriptorPath(
      this.generatedServicesPath,
      parsedTarget.name,
      parsedTarget.descriptor,
    );
    try {
      const data = await readFile(descriptorPath);
      for await (const result of parser({ data, location })) {
        emit(result);
      }
      emit(
        processingResult.refresh(
          `${LOCAL_CATALOG_LOCATION_TYPE}:${location.target}`,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown file read error';
      emit(processingResult.generalError(location, message));
    }
    return true;
  }
}
