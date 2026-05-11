import type { JrProperty } from './element';

export interface Field {
  name: string;
  /** Java class, e.g. "java.lang.String" */
  class: string;
  description?: string;
  properties?: JrProperty[];
}

export interface Parameter {
  name: string;
  class: string;
  isForPrompting?: boolean;
  defaultValueExpression?: string;
  description?: string;
  properties?: JrProperty[];
}

export interface Variable {
  name: string;
  class: string;
  resetType?: 'None' | 'Report' | 'Page' | 'Column' | 'Group';
  resetGroup?: string;
  incrementType?: 'None' | 'Report' | 'Page' | 'Column' | 'Group';
  incrementGroup?: string;
  calculation?:
    | 'Nothing'
    | 'Count'
    | 'DistinctCount'
    | 'Sum'
    | 'Average'
    | 'Lowest'
    | 'Highest'
    | 'StandardDeviation'
    | 'Variance'
    | 'System'
    | 'First';
  variableExpression?: string;
  initialValueExpression?: string;
}

export interface Group {
  name: string;
  expression?: string;
  isStartNewColumn?: boolean;
  isStartNewPage?: boolean;
  minHeightToStartNewPage?: number;
  /** Group header bands (a group can have multiple). */
  groupHeader?: import('./band').Band[];
  groupFooter?: import('./band').Band[];
}

export interface Query {
  language?: string;
  text: string;
}
