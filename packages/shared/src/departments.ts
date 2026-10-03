/**
 * Government bodies named in scheme records. The English name stays in the data (it is what the official source
 * publishes and what audits compare against); the UI shows the localized name via `dept.<id>`.
 */
export const DEPARTMENTS = {
  agri: 'Ministry of Agriculture and Farmers Welfare',
  finance: 'Ministry of Finance',
  housing_urban: 'Ministry of Housing and Urban Affairs',
  msme: 'Ministry of Micro, Small and Medium Enterprises',
  skill: 'Ministry of Skill Development and Entrepreneurship',
  rural_dev: 'Ministry of Rural Development',
  petroleum: 'Ministry of Petroleum and Natural Gas',
  wcd: 'Ministry of Women and Child Development',
  pb_govt: 'Government of Punjab',
  pb_sswcd: 'Department of Social Security and Women & Child Development, Punjab',
  rj_govt: 'Government of Rajasthan',
  rj_school: 'Education (Elementary and Secondary) Department, Government of Rajasthan',
  rj_higher: 'Higher Education Department, Government of Rajasthan',
} as const;

export type DepartmentId = keyof typeof DEPARTMENTS;

const BY_NAME = new Map<string, DepartmentId>(Object.entries(DEPARTMENTS).map(([id, name]) => [name, id as DepartmentId]));
export const departmentId = (name: string): DepartmentId | undefined => BY_NAME.get(name);
