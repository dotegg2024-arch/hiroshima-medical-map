$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
try {
    $workbook = $excel.Workbooks.Open("c:\Users\scdc\Desktop\MAP\temp.xlsx")
    $workbook.SaveAs("c:\Users\scdc\Desktop\MAP\hiroshima_official_data.csv", 6) # 6 = CSV
    Write-Host "Conversion successful: c:\Users\scdc\Desktop\MAP\hiroshima_official_data.csv"
} catch {
    Write-Host "Error during conversion: $_"
} finally {
    if ($workbook) { $workbook.Close($false) }
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
