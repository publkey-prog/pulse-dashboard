<?php
declare(strict_types=1);
if (isset($_GET['verify']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode(['build' => hash_file('sha256', __FILE__)]);
    exit;
}


// Public read-only cash quotes. These sources do not receive dashboard data.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    echo '{"error":"method_not_allowed"}';
    exit;
}
function downloadRates(string $url): string {
    if (!function_exists('curl_init')) return '';
    $c = curl_init($url);
    curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_ENCODING => '',
        CURLOPT_CONNECTTIMEOUT => 3, CURLOPT_TIMEOUT => 8, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
        CURLOPT_USERAGENT => 'Pulse Dashboard cash-rate reader/1.0']);
    $body = curl_exec($c);
    $status = curl_getinfo($c, CURLINFO_HTTP_CODE);
    curl_close($c);
    return $status === 200 && is_string($body) ? $body : '';
}
function pricePair($buy, $sell): ?array {
    $buy = str_replace(',', '.', (string)$buy);
    $sell = str_replace(',', '.', (string)$sell);
    if (!is_numeric($buy) || !is_numeric($sell) || (float)$buy <= 0 || (float)$sell < (float)$buy) return null;
    return ['buy' => (float)$buy, 'sell' => (float)$sell];
}
function cashTable(string $html): array {
    $banks = ['privatbank' => 'privat', 'oschadbank' => 'oschad', 'sensebank' => 'sense'];
    $quotes = [];
    preg_match_all('~<table\b[^>]*>(.*?)</table>~is', $html, $tables);
    foreach ($tables[1] as $table) {
        if (!preg_match('~<thead\b[^>]*>(.*?)</thead>~is', $table, $header)) continue;
        // Confirm the column order rather than accidentally displaying the card rate.
        preg_match_all('~<th\b[^>]*>(.*?)</th>~is', $header[1], $heads);
        if (!isset($heads[1][1]) || trim(strip_tags($heads[1][1])) !== 'В касах банків') continue;
        preg_match_all('~<tr\b[^>]*>(.*?)</tr>~is', $table, $rows);
        foreach ($rows[1] as $row) {
            preg_match_all('~<td\b[^>]*>(.*?)</td>~is', $row, $cells);
            if (count($cells[1]) < 4 || !preg_match('~/company/(oschadbank|privatbank|sensebank)/~', $cells[1][0], $match)) continue;
            if (!preg_match('~^\s*([\d.,]+)\s*/\s*([\d.,]+)\s*$~', strip_tags($cells[1][1]), $prices)) continue;
            $pair = pricePair($prices[1], $prices[2]);
            if ($pair) $quotes[$banks[$match[1]]] = $pair + ['source' => 'minfin',
                'quoteTime' => trim(strip_tags($cells[1][3]))];
        }
    }
    return $quotes;
}
$quotes = cashTable(downloadRates('https://minfin.com.ua/ua/currency/kiev/usd/'));
$privat = json_decode(downloadRates('https://api.privatbank.ua/p24api/pubinfo?exchange&coursid=5'), true);
foreach (is_array($privat) ? $privat : [] as $entry) {
    if (($entry['ccy'] ?? '') !== 'USD' || ($entry['base_ccy'] ?? '') !== 'UAH') continue;
    $pair = pricePair($entry['buy'] ?? '', $entry['sale'] ?? '');
    if ($pair) $quotes['privat'] = $pair + ['source' => 'privat', 'quoteTime' => ''];
}
if (!$quotes) http_response_code(503);
echo json_encode(['checkedAt' => gmdate('c'), 'quotes' => $quotes], JSON_UNESCAPED_UNICODE);
