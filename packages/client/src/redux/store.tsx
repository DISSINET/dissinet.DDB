import { configureStore } from "@reduxjs/toolkit";
import { combineReducers, Store } from "redux";
import firstPanelExpandedSlice from "./features/layout/firstPanelExpandedSlice";
import fourthPanelExpandedSlice from "./features/layout/fourthPanelExpandedSlice";
import fourthPanelBoxesOpenedSlice from "./features/layout/fourthPanelBoxesOpenedSlice";
import layoutWidthSlice from "./features/layout/layoutWidthSlice";
import panelWidthsSlice from "./features/layout/panelWidthsSlice";
import separatorXPositionSlice from "./features/layout/separatorXPositionSlice";
import draggedActantRowSlice from "./features/rowDnd/draggedActantRowSlice";
import draggedPropRowSlice from "./features/rowDnd/draggedPropRowSlice";
import draggedRowIdSlice from "./features/statementList/draggedRowIdSlice";
import rowsExpandedSlice from "./features/statementList/rowsExpandedSlice";
import draggedEntitySlice from "./features/territoryTree/draggedEntitySlice";
import selectedTerritoryPathSlice from "./features/territoryTree/selectedTerritoryPathSlice";
import treeInitializeSlice from "./features/territoryTree/treeInitializeSlice";
import usernameSlice from "./features/usernameSlice";
import contentHeightSlice from "./features/layout/contentHeightSlice";
import statementListOpenedSlice from "./features/layout/statementListOpenedSlice";
import lastClickedIndexSlice from "./features/statementList/lastClickedIndexSlice";
import disableStatementListScrollSlice from "./features/statementList/disableStatementListScrollSlice";
import disableTreeScrollSlice from "./features/territoryTree/disableTreeScrollSlice";
import filterOpenSlice from "./features/territoryTree/filterOpenSlice";
import pingSlice from "./features/pingSlice";
import showWarningsSlice from "./features/statementEditor/showWarningsSlice";
import themeSlice from "./features/themeSlice";
import isLoadingSlice from "./features/statementList/isLoadingSlice";
import thirdPanelExpandedSlice from "./features/layout/thirdPanelExpandedSlice";

const store: Store = configureStore({
  reducer: {
    theme: themeSlice,
    username: usernameSlice,
    ping: pingSlice,
    draggedEntity: draggedEntitySlice,
    territoryTree: combineReducers({
      selectedTerritoryPath: selectedTerritoryPathSlice,
      treeInitialized: treeInitializeSlice,
      disableTreeScroll: disableTreeScrollSlice,
      filterOpen: filterOpenSlice,
    }),
    statementList: combineReducers({
      rowsExpanded: rowsExpandedSlice,
      draggedRowId: draggedRowIdSlice,
      lastClickedIndex: lastClickedIndexSlice,
      disableStatementListScroll: disableStatementListScrollSlice,
      isLoading: isLoadingSlice,
    }),
    statementEditor: combineReducers({
      showWarnings: showWarningsSlice,
    }),
    rowDnd: combineReducers({
      draggedPropRow: draggedPropRowSlice,
      draggedActantRow: draggedActantRowSlice,
    }),
    layout: combineReducers({
      layoutWidth: layoutWidthSlice,
      contentHeight: contentHeightSlice,
      panelWidths: panelWidthsSlice,
      separatorXPosition: separatorXPositionSlice,
      firstPanelExpanded: firstPanelExpandedSlice,
      thirdPanelExpanded: thirdPanelExpandedSlice,
      fourthPanelExpanded: fourthPanelExpandedSlice,
      fourthPanelBoxesOpened: fourthPanelBoxesOpenedSlice,
      statementListOpened: statementListOpenedSlice,
    }),
  },
});

export default store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
