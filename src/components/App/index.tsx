import { useApp } from "@/hooks/useApp";
import { Topbar } from "@/components/Topbar";
import { MainContent } from "@/components/MainContent";
import { MultiSelectIndicator } from "@/components/MultiSelectIndicator";
import { PreviewPanel } from "@/components/PreviewPanel";
import { Footer } from "@/components/Footer";
import { UpdateBanner } from "@/components/UpdateBanner";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { PermissionsDialog } from "@/components/PermissionsDialog";
import { container, inlineToast, inlineToastGreen, mainColumn, reactivateBtn } from "@/components/App/index.css";

function App() {
  const {
    theme,
    mode,
    openActivationWindow,
    showPermissionsDialog,
    onPermissionsDone,
    activatedToast,
    revokedBanner,
    upgradeBannerFeature,
    dismissUpgradeBanner,
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
  } = useApp();

  if (mode === "first_launch") {
    return null;
  }

  return (
    <>
    {showPermissionsDialog && <PermissionsDialog onDone={onPermissionsDone} />}
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
