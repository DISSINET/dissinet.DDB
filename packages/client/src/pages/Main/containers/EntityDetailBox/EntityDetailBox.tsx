import { IResponseEntity } from "@shared/types";
import api from "api";
import { useSearchParams } from "hooks";
import React, { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { EntityDetail } from "./EntityDetail/EntityDetail";
import { StyledTabGroup } from "./EntityDetailBoxStyles";
import { EntityDetailTab } from "./EntityDetailTab/EntityDetailTab";
import update from "immutability-helper";
import { Loader } from "components";
import { useAppSelector } from "redux/hooks";

interface EntityDetailBox {}
export const EntityDetailBox: React.FC<EntityDetailBox> = ({}) => {
  const ping: number = useAppSelector((state) => state.ping);
  const detailBoxMinimized: boolean = useAppSelector(
    (state) => state.layout.detailBoxMinimized
  );

  const {
    detailIdArray,
    removeDetailId,
    selectedDetailId,
    setSelectedDetailId,
    appendDetailId,
    clearAllDetailIds,
    replaceDetailIds,
  } = useSearchParams();

  useEffect(() => {
    if (!selectedDetailId && detailIdArray.length) {
      setSelectedDetailId(detailIdArray[0]);
    } else if (selectedDetailId && !detailIdArray.includes(selectedDetailId)) {
      appendDetailId(selectedDetailId);
    }
  }, [selectedDetailId, detailIdArray]);

  const [entities, setEntities] = useState<IResponseEntity[]>([]);

  const { data, error } = useQuery({
    queryKey: ["detail-tab-entities", detailIdArray],
    queryFn: async () => {
      const res = await api.entitiesSearch({ entityIds: detailIdArray });
      return res.data;
    },
    enabled: api.isLoggedIn() && detailIdArray.length > 0,
  });

  useEffect(() => {
    if (error && (error as any).message === "unknown class for entity") {
      clearAllDetailIds();

      // TODO: filter ids with valid entity classes and push to url
      // if (data) {
      //   const validIds = data.map((entity) => entity.id);
      //   clearAllDetailIds();
      //   validIds.forEach((id) => appendDetailId(id));
      // }
    }
  }, [error]);

  useEffect(() => {
    if (data) {
      if (JSON.stringify(data) !== JSON.stringify(entities)) {
        setEntities(data);
      }
      if (data.length < detailIdArray.length) {
        const idsFromData = data.map((d) => d.id);
        const idsToClear = detailIdArray.filter(
          (detailId) => !idsFromData.includes(detailId)
        );
        if (idsToClear.length) {
          idsToClear.forEach((id) => removeDetailId(id));
        }
      }
    }
  }, [data]);

  const handleClose = (entityId: string) => {
    const newEntities: IResponseEntity[] = entities.filter(
      (e) => e.id !== entityId
    );
    setEntities(newEntities);
    removeDetailId(entityId);
  };

  const moveRow = useCallback((dragIndex: number, hoverIndex: number) => {
    setEntities((prevEntities) =>
      update(prevEntities, {
        $splice: [
          [dragIndex, 1],
          [hoverIndex, 0, prevEntities[dragIndex]],
        ],
      })
    );
  }, []);

  // delay of show content for fluent animation on open
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    if (!detailBoxMinimized) {
      setTimeout(() => {
        setShowContent(true);
      }, 800);
    } else {
      setShowContent(false);
    }
  }, [detailBoxMinimized]);

  const {
    status,
    data: entity,
    error: entityError,
    isFetching,
  } = useQuery({
    queryKey: ["entity", selectedDetailId],
    queryFn: async () => {
      const res = await api.detailGet(selectedDetailId);
      return res.data;
    },
    enabled: !!selectedDetailId && api.isLoggedIn(),
  });

  return (
    <>
      {(showContent || detailBoxMinimized) && (
        <StyledTabGroup>
          {entities &&
            entities.length > 0 &&
            entities?.map((entity, key) => (
              <EntityDetailTab
                key={key}
                index={key}
                entity={entity}
                onClick={() => setSelectedDetailId(entity.id)}
                onClose={() => handleClose(entity.id)}
                isSelected={selectedDetailId === entity.id}
                moveRow={moveRow}
                onDragEnd={() => {
                  replaceDetailIds(entities.map((e) => e.id));
                }}
              />
            ))}
        </StyledTabGroup>
      )}

      <>
        {selectedDetailId && showContent && entity ? (
          <EntityDetail
            detailId={selectedDetailId}
            entity={entity}
            error={entityError}
            isFetching={isFetching}
          />
        ) : (
          <>
            {(ping === -10 || ping >= 0) && !detailBoxMinimized && (
              <Loader show />
            )}
          </>
        )}
      </>
    </>
  );
};

export const MemoizedEntityDetailBox = React.memo(EntityDetailBox);
