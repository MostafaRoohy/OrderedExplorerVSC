export type ResourceCreationKind = 'file' | 'directory';

export interface ResourceCreationInput {
    readonly kind: ResourceCreationKind;
    readonly relativePath: string;
}

export function parseResourceCreationInput(value: string): ResourceCreationInput {
    const trimmed = value.trim();
    const directory = /[\\/]$/.test(trimmed);
    const relativePath = directory
        ? trimmed.replace(/[\\/]+$/, '')
        : trimmed;

    return {
        kind: directory ? 'directory' : 'file',
        relativePath,
    };
}
