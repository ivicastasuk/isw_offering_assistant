; NSIS installer script for ISW Offering Assistant

!define PRODUCT_NAME "ISW Offering Assistant"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "ISW Software"
!define PRODUCT_WEB_SITE "https://github.com/ivicastasuk/isw_offering_assistant"

; Custom pages and settings
!define MUI_WELCOMEFINISHPAGE_BITMAP "assets\icons\installer-banner.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "assets\icons\installer-banner.bmp"
!define MUI_HEADERIMAGE
!define MUI_HEADERIMAGE_BITMAP "assets\icons\installer-header.bmp"
!define MUI_HEADERIMAGE_RIGHT

; Custom finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_NAME}.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Pokreni $(^Name)"
!define MUI_FINISHPAGE_LINK "Posetite našu web stranicu"
!define MUI_FINISHPAGE_LINK_LOCATION "${PRODUCT_WEB_SITE}"

; Registry settings
WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayName" "${PRODUCT_NAME}"
WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "UninstallString" "$INSTDIR\Uninstall.exe"
WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayIcon" "$INSTDIR\${PRODUCT_NAME}.exe"
WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "DisplayVersion" "${PRODUCT_VERSION}"
WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "Publisher" "${PRODUCT_PUBLISHER}"
WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"

; File associations
WriteRegStr HKCR ".isw" "" "ISW.OfferFile"
WriteRegStr HKCR "ISW.OfferFile" "" "ISW Offer File"
WriteRegStr HKCR "ISW.OfferFile\DefaultIcon" "" "$INSTDIR\${PRODUCT_NAME}.exe,0"
WriteRegStr HKCR "ISW.OfferFile\shell\open\command" "" '"$INSTDIR\${PRODUCT_NAME}.exe" "%1"'
