import type { RequirementDetailRead } from "@/lib/api/generated/model";

import {
  DISPLAY_DETAIL_TYPE,
  IMPLEMENTATION_UNIT_DETAIL_TYPE,
  INPUT_DETAIL_TYPE,
  PARENT_SCREEN_FIELD,
  PARENT_UNIT_FIELD,
  SCREEN_ID_FIELD,
  SCREEN_OPERATION_DETAIL_TYPE,
  UNIT_ID_FIELD,
} from "./requirement-detail-metadata";

export type RequirementDetailTree = {
  units: RequirementDetailUnitNode[];
  ungrouped: RequirementDetailRead[];
};

export type RequirementDetailUnitNode = {
  id: string;
  detail: RequirementDetailRead;
  screens: RequirementDetailScreenNode[];
  directDetails: RequirementDetailRead[];
};

export type RequirementDetailScreenNode = {
  id: string;
  detail: RequirementDetailRead;
  details: RequirementDetailRead[];
};

export const buildRequirementDetailTree = (
  details: RequirementDetailRead[],
): RequirementDetailTree => {
  const unitDetails = details.filter(
    (detail) => detail.detail_type === IMPLEMENTATION_UNIT_DETAIL_TYPE,
  );
  const screenDetails = details.filter(
    (detail) => detail.detail_type === SCREEN_OPERATION_DETAIL_TYPE,
  );
  const unitNodes = unitDetails.map((detail) => ({
    id: getRequirementDetailUnitId(detail),
    detail,
    screens: [] as RequirementDetailScreenNode[],
    directDetails: [] as RequirementDetailRead[],
  }));
  const unitById = new Map(unitNodes.map((unit) => [unit.id, unit]));
  const screenById = new Map<string, RequirementDetailScreenNode>();
  const ungrouped: RequirementDetailRead[] = [];

  for (const screenDetail of screenDetails) {
    const parentUnitId = getStringValue(screenDetail, PARENT_UNIT_FIELD);
    const unit = parentUnitId ? unitById.get(parentUnitId) : undefined;
    const screenNode: RequirementDetailScreenNode = {
      id: getRequirementDetailScreenId(screenDetail),
      detail: screenDetail,
      details: [],
    };

    screenById.set(screenNode.id, screenNode);

    if (unit) {
      unit.screens.push(screenNode);
    } else {
      ungrouped.push(screenDetail);
    }
  }

  for (const detail of details) {
    if (
      detail.detail_type === IMPLEMENTATION_UNIT_DETAIL_TYPE ||
      detail.detail_type === SCREEN_OPERATION_DETAIL_TYPE
    ) {
      continue;
    }

    const parentUnitId = getStringValue(detail, PARENT_UNIT_FIELD);
    const unit = parentUnitId ? unitById.get(parentUnitId) : undefined;

    if (!unit) {
      ungrouped.push(detail);
      continue;
    }

    const parentScreenId = getStringValue(detail, PARENT_SCREEN_FIELD);
    const screen =
      parentScreenId &&
      (detail.detail_type === INPUT_DETAIL_TYPE ||
        detail.detail_type === DISPLAY_DETAIL_TYPE)
        ? screenById.get(parentScreenId)
        : undefined;

    if (screen) {
      screen.details.push(detail);
    } else {
      unit.directDetails.push(detail);
    }
  }

  return {
    units: unitNodes,
    ungrouped,
  };
};

export const getRequirementDetailUnitId = (detail: RequirementDetailRead) => {
  return getStringValue(detail, UNIT_ID_FIELD) || `detail_${detail.id}`;
};

export const getRequirementDetailScreenId = (detail: RequirementDetailRead) => {
  return getStringValue(detail, SCREEN_ID_FIELD) || `detail_${detail.id}`;
};

export const getRequirementDetailUnitOptions = (
  details: RequirementDetailRead[],
) => {
  return details
    .filter((detail) => detail.detail_type === IMPLEMENTATION_UNIT_DETAIL_TYPE)
    .map((detail) => ({
      value: getRequirementDetailUnitId(detail),
      label: getDetailOptionLabel(detail),
    }));
};

export const getRequirementDetailScreenOptions = (
  details: RequirementDetailRead[],
  parentUnitId?: string,
) => {
  return details
    .filter((detail) => detail.detail_type === SCREEN_OPERATION_DETAIL_TYPE)
    .filter((detail) => {
      if (!parentUnitId) {
        return true;
      }

      return getStringValue(detail, PARENT_UNIT_FIELD) === parentUnitId;
    })
    .map((detail) => ({
      value: getRequirementDetailScreenId(detail),
      label: getDetailOptionLabel(detail),
    }));
};

const getDetailOptionLabel = (detail: RequirementDetailRead) => {
  const detailJson = detail.detail_json ?? {};

  return (
    getRawStringValue(detailJson.title) ||
    getRawStringValue(detailJson.screen_name) ||
    getRawStringValue(detailJson.item_name) ||
    `ID: ${detail.id}`
  );
};

const getStringValue = (detail: RequirementDetailRead, key: string) => {
  return getRawStringValue(detail.detail_json?.[key]);
};

const getRawStringValue = (value: unknown) => {
  return typeof value === "string" && value.trim() ? value.trim() : "";
};
