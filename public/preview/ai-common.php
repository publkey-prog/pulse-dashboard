<?php
declare(strict_types=1);
if (isset($_GET['verify']) && realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode(['build' => hash_file('sha256', __FILE__)]);
    exit;
}

const PULSE_PRIVATE='/home/publkey4/pulse-private';
function pulse_fail($status,$message){http_response_code($status);header('Content-Type: application/json');echo json_encode(['error'=>$message],JSON_UNESCAPED_UNICODE);exit;}
if(realpath($_SERVER['SCRIPT_FILENAME']??'')===__FILE__)pulse_fail(404,'not_found');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
function pulse_secret(){ $s=trim((string)@file_get_contents(PULSE_PRIVATE.'/schedule-access-code.txt'));if(strlen($s)<24)pulse_fail(503,'Доступ к ИИ не настроен');return $s;}
function pulse_cookie($purpose,$until,$persist){
 $value=$until.'.'.hash_hmac('sha256',$purpose.'|'.$until,pulse_secret());
 setcookie('pulse_preview_'.$purpose,$value,['expires'=>$persist?$until:0,'path'=>'/preview/','secure'=>true,'httponly'=>true,'samesite'=>'Strict']);
}
function pulse_valid($purpose){$v=explode('.',$_COOKIE['pulse_preview_'.$purpose]??'');return count($v)===2 && ctype_digit($v[0]) && intval($v[0])>=time() && hash_equals(hash_hmac('sha256',$purpose.'|'.$v[0],pulse_secret()),$v[1]);}
function pulse_authorize(){if(!pulse_valid('ai'))pulse_fail(401,'Требуется пароль ИИ');}
function pulse_archive_owner(){if(!pulse_valid('archive'))pulse_fail(401,'Требуется доступ к архиву');return hash_hmac('sha256','personal-preview-archive',pulse_secret());}
function pulse_post(){if(($_SERVER['REQUEST_METHOD']??'')!=='POST')pulse_fail(405,'post_required');
 if(($_SERVER['HTTP_X_PULSE_REQUEST']??'')!=='1')pulse_fail(403,'Недопустимый запрос');}
