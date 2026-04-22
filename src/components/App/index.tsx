import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { useAppState } from "@/hooks/useAppState";
import { useTheme } from "@/hooks/useTheme";
import { useLicense } from "@/hooks/useLicense";
import { Topbar } from "@/components/Topbar";
import { MainContent } from "@/components/MainContent";
import { MultiSelectIndicator } from "@/components/MultiSelectIndicator";
import { PreviewPanel } from "@/components/PreviewPanel";
import { Footer } from "@/components/Footer";
import { UpdateBanner } from "@/components/UpdateBanner";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { PermissionsDialog, PermissionsStatus } from "@/components/PermissionsDialog";
import { container, inlineToast, inlineToastGreen, mainColumn, reactivateBtn } from "@/components/App/index.css";

function App() {
  const { theme } = useTheme();
  const { mode, openActivationWindow } = useLicense();
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [activatedToast, setActivatedToast] = useState(false);
  const [revokedBanner, setRevokedBanner] = useState(false);
  const [upgradeBannerFeature, setUpgradeBannerFeature] = useState<string | null>(null);

  const {
    query,
    setQuery,
    inputRef,
    dismiss,
    visibleEntries,
    selectedIndex,
    setSelectedIndex,
    listRef,
    onClickItem,
    enterPinnedSection,
    liftingId,
    landingId,
    deletingId,
    screen,
    setScreen,
    executePasteOption,
    setPasteAsPreviewText,
    openPreview,
    isPreviewOpen,
    selectedItem,
    pasteAsPreviewText,
    clearConfirm,
    multiSelect,
    defaultSeparator,
    onMergePaste,
    folders,
    folderNameInputValue,
    setFolderNameInputValue,
    confirmFolderNameInput,
    confirmFolderDelete,
    moveItemToFolder,
    removeItemFromFolder,
    expandedFolderId,
    enterFolderSection,
    maxFoldersToast,
    updateInfo,
    installUpdate,
    dismissUpdate,
  } = useAppState({ onTrialError: (feature) => setUpgradeBannerFeature(feature), isActivated: mode === "activated" });

  const checkStoreFlags = useCallback(() => {
    load("app-store.json")
      .then((store) => {
        return store.get<boolean>("just_activated").then((val) => {
          if (val) {
            setActivatedToast(true);
            store.delete("just_activated");
            store.save().catch(console.error);
            setTimeout(() => setActivatedToast(false), 2000);
          }
          return store.get<boolean>("license_revoked");
        });
      })
      .then((revoked) => {
        if (revoked) setRevokedBanner(true);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    invoke<PermissionsStatus>("check_permissions")
      .then((status) => {
        if (!status.accessibility || !status.input_monitoring) {
          setShowPermissionsDialog(true);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    checkStoreFlags();
  }, [checkStoreFlags]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") checkStoreFlags();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [checkStoreFlags]);

  const dismissUpgradeBanner = useCallback(() => setUpgradeBannerFeature(null), []);

  if (mode === "first_launch") {
    return null;
  }

  return (
    <>
    {showPermissionsDialog && <PermissionsDialog onDone={() => setShowPermissionsDialog(false)} />}
    <div className={container}>
      <div className={mainColumn}>
        <Topbar
          inputRef={inputRef}
          query={query}
          onQueryChange={setQuery}
          onDismiss={dismiss}
          overlayActive={screen.kind !== "history" || multiSelect.active}
          theme={theme}
          licenseMode={mode}
          onOpenActivation={openActivationWindow}
        />
        {multiSelect.active && screen.kind !== "separatorPicker" && (
          <MultiSelectIndicator
            selections={multiSelect.selections}
            maxToastVisible={multiSelect.maxToastVisible}
          />
        )}
        {activatedToast && <div className={inlineToastGreen}>Kurippa activated ✓</div>}
        {revokedBanner && (
          <div className={inlineToast}>
            Your license is no longer valid ·{" "}
            <button
              className={reactivateBtn}
              onClick={openActivationWindow}
            >
              Re-activate →
            </button>
          </div>
        )}
        {maxFoldersToast && <div className={inlineToast}>Max 10 folders reached</div>}
        {updateInfo && (
          <UpdateBanner
            version={updateInfo.version}
            onInstall={installUpdate}
            onDismiss={dismissUpdate}
          />
        )}
        {upgradeBannerFeature && (
          <UpgradeBanner
            feature={upgradeBannerFeature}
            onDismiss={dismissUpgradeBanner}
          />
        )}
        <MainContent
          screen={screen}
          setScreen={setScreen}
          executePasteOption={executePasteOption}
          setPasteAsPreviewText={setPasteAsPreviewText}
          openPreview={openPreview}
          defaultSeparator={defaultSeparator}
          onMergePaste={onMergePaste}
          folderNameInputValue={folderNameInputValue}
          setFolderNameInputValue={setFolderNameInputValue}
          confirmFolderNameInput={confirmFolderNameInput}
          confirmFolderDelete={confirmFolderDelete}
          folders={folders}
          visibleEntries={visibleEntries}
          moveItemToFolder={moveItemToFolder}
          removeItemFromFolder={removeItemFromFolder}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          listRef={listRef}
          onClickItem={onClickItem}
          enterPinnedSection={enterPinnedSection}
          enterFolderSection={enterFolderSection}
          expandedFolderId={expandedFolderId}
          liftingId={liftingId}
          landingId={landingId}
          deletingId={deletingId}
          multiSelectActive={multiSelect.active}
          selections={multiSelect.selections}
          flashingId={multiSelect.flashingId}
        />
        <Footer
          showConfirm={clearConfirm.show}
          onRequestClear={clearConfirm.onRequest}
          onConfirmClear={clearConfirm.onConfirm}
          onCancelClear={clearConfirm.onCancel}
        />
      </div>
      {isPreviewOpen && <PreviewPanel item={selectedItem} previewOverride={pasteAsPreviewText} />}
    </div>
    </>
  );
}

export default App;
