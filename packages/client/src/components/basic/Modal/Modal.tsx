import { config, useSpring } from "@react-spring/web";
import { ThemeColor } from "Theme/theme";
import { Loader } from "components";
import React, { FC, ReactNode } from "react";
import { ModalKeyPress } from "./ModalKeyPress";
import {
  StyledBackground,
  StyledCard,
  StyledCardBody,
  StyledCardHeader,
  StyledCardIcon,
  StyledCardTitle,
  StyledCloseIconWrap,
  StyledFooter,
  StyledIoClose,
  StyledModalInputForm,
  StyledModalInputLabel,
  StyledModalInputWrap,
  StyledModalWrap,
} from "./ModalStyles";
import ReactDOM from "react-dom";

interface Modal {
  children?: ReactNode;
  onClose?: () => void;
  onEnterPress?: () => void;
  showModal: boolean;
  disableBgClick?: boolean;
  width?: "full" | "fat" | "normal" | "auto" | number;
  disableEscapeClose?: boolean;
  disableBackground?: boolean;
  isLoading?: boolean;
  fullHeight?: boolean;
}
export const Modal: FC<Modal> = ({
  children,
  onClose = () => {},
  onEnterPress = () => {},
  showModal,
  disableBgClick = false,
  width = "normal",
  disableEscapeClose = false,
  disableBackground = false,
  isLoading = false,
  fullHeight = false,
}) => {
  const animatedMount = useSpring({
    opacity: showModal ? 1 : 0,
    config: config.stiff,
  });

  return (
    <>
      {showModal && (
        <>
          {ReactDOM.createPortal(
            <StyledModalWrap>
              {!disableBackground && (
                <StyledBackground
                  style={animatedMount}
                  onClick={disableBgClick ? () => {} : onClose}
                />
              )}
              <ModalCard
                animatedMount={animatedMount}
                width={width}
                isLoading={isLoading}
                fullHeight={fullHeight}
              >
                {children}
              </ModalCard>
            </StyledModalWrap>,
            document.body
          )}
          <ModalKeyPress
            onEnter={onEnterPress}
            onEscape={disableEscapeClose ? () => {} : onClose}
          />
        </>
      )}
    </>
  );
};

interface ModalCard {
  children?: ReactNode;
  width: "full" | "fat" | "normal" | "auto" | number;
  animatedMount: any;
  isLoading?: boolean;
  fullHeight: boolean;
}
export const ModalCard: FC<ModalCard> = ({
  children,
  width,
  animatedMount,
  isLoading,
  fullHeight,
}) => {
  return (
    <StyledCard style={animatedMount} width={width} $fullHeight={fullHeight}>
      {children}
      <Loader show={isLoading} />
    </StyledCard>
  );
};

interface ModalHeader {
  title?: string | React.ReactElement;
  color?: keyof ThemeColor;
  icon?: React.ReactNode;
  onClose?: () => void;
  boldTitle?: boolean;
}
export const ModalHeader: FC<ModalHeader> = ({
  title,
  color,
  icon,
  onClose,
  boldTitle,
}) => {
  return (
    <>
      <StyledCardHeader $color={color}>
        {icon && <StyledCardIcon>{icon}</StyledCardIcon>}
        <StyledCardTitle $boldTitle={boldTitle}>{title}</StyledCardTitle>
        {onClose && (
          <StyledCloseIconWrap onClick={onClose}>
            <StyledIoClose size={20} />
          </StyledCloseIconWrap>
        )}
      </StyledCardHeader>
    </>
  );
};

interface ModalContent {
  column?: boolean;
  children?: ReactNode;
  enableScroll?: boolean;
  centered?: boolean;
}
export const ModalContent: FC<ModalContent> = ({
  children,
  column,
  enableScroll = false,
  centered,
}) => {
  return (
    <StyledCardBody
      $column={column}
      $enableScroll={enableScroll}
      centered={centered}
    >
      {children}
    </StyledCardBody>
  );
};

interface ModalFooter {
  children?: ReactNode;
  column?: boolean;
}
export const ModalFooter: FC<ModalFooter> = ({ children, column = false }) => {
  return <StyledFooter $column={column}>{children}</StyledFooter>;
};

// Input form helpers
interface ModalInputForm {
  children?: React.ReactNode;
  alignLeft?: boolean; // centered by default
}
export const ModalInputForm: React.FC<ModalInputForm> = ({
  children,
  alignLeft = false,
}) => {
  return (
    <StyledModalInputForm $alignLeft={alignLeft}>
      {children}
    </StyledModalInputForm>
  );
};
interface ModalInputLabel {
  children?: React.ReactNode;
}
export const ModalInputLabel: React.FC<ModalInputLabel> = ({ children }) => {
  return <StyledModalInputLabel>{children}</StyledModalInputLabel>;
};
interface ModalInputWrap {
  width?: number;
  children?: React.ReactNode;
}
export const ModalInputWrap: React.FC<ModalInputWrap> = ({
  width,
  children,
}) => {
  return <StyledModalInputWrap width={width}>{children}</StyledModalInputWrap>;
};
