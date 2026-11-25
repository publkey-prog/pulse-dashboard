<?php
declare(strict_types=1);
define('PULSE_SCENE_TEST', true);
require __DIR__.'/../public/preview/scenes.php';
function check(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
    echo "PASS ".$message.PHP_EOL;
}
$context=['today'=>[
    ['id'=>'1','title'=>'Урок английского','projectGoal'=>'Обучение ребёнка'],
    ['id'=>'2','title'=>'Запуск сайта','projectGoal'=>'Продажи']
], 'thoughts'=>[
    ['title'=>'Поездка','status'=>'active'],
    ['title'=>'Закрытая мысль','status'=>'done']
], 'notes'=>[
    ['title'=>'Идея кафе','body'=>'Встреча с друзьями'],
    ['title'=>'Архивная заметка','archivedAt'=>'2026-11-01']
]];
$sources=scene_sources($context);
check(count($sources)===4,'Every today task, active thought and active note is retained');
check($sources[1]['data']['projectGoal']==='Продажи','Project meaning is retained');
$episodes=array_map(static function($s){return ['source_id'=>$s['id'],'action'=>'Разные персонажи взаимодействуют с предметами'];},$sources);
$news=[['title'=>'В городе открыли новый парк - Источник','url'=>'https://news.google.com/rss/articles/new']];
$plan=['art_direction'=>'Яркий современный город ночью','episodes'=>$episodes,'news_index'=>0,'news_scene'=>'Посетители гуляют по новому парку'];
check(scene_validate_plan($plan,$sources,$news),'Complete scene plan accepted');
$missing=$plan;array_pop($missing['episodes']);
check(!scene_validate_plan($missing,$sources,$news),'Missing note blocks image generation');
$duplicate=$plan;$duplicate['episodes'][3]=$duplicate['episodes'][0];
check(!scene_validate_plan($duplicate,$sources,$news),'Repeated source cannot replace another source');
$empty=$plan;$empty['episodes'][0]['action']=' ';
check(!scene_validate_plan($empty,$sources,$news),'Empty task scene rejected');
$invalid=$plan;$invalid['news_index']=1;
check(!scene_validate_plan($invalid,$sources,$news),'Invented news index rejected');
$none=$plan;$none['news_index']=-1;$none['news_scene']='';
check(scene_validate_plan($none,$sources,[]),'No fresh news is a valid honest fallback');
$old=[['news'=>$news[0]]];
check(scene_news_used($news[0],$old),'Previously used news URL rejected');
check(scene_news_used(['title'=>'В городе открыли новый парк - Другой источник','url'=>'https://news.google.com/rss/articles/other'],$old),'Same headline from another publisher rejected');
check(!scene_news_used(['title'=>'В городе начался концерт - Источник','url'=>'https://news.google.com/rss/articles/concert'],$old),'New event remains eligible for semantic review');
$history=[['composition'=>'street'],['composition'=>'park'],['composition'=>'square']];
for($i=0;$i<50;$i++) {
    if(in_array(scene_composition($history)['id'],['street','park','square'],true)) throw new RuntimeException('Repeated recent composition');
}
check(true,'Last three compositions excluded');
$prompt=scene_image_prompt($none,$sources,['city'=>'Киев','created'=>'2026-11-25T23:00:00+02:00','news'=>null],scene_composition([]));
foreach($sources as $source) check(strpos($prompt,'мини-сцена '.$source['id'].':')!==false,'Image brief includes '.$source['id']);
check(strpos($prompt,'Продажи')!==false,'Image receives project context');
check(strpos($prompt,'Не рисуй списки задач')!==false && strpos($prompt,'Никакого средневековья')!==false,'No boards and contemporary setting enforced in image brief');
check(strpos($prompt,'Не превращай ночь в день')!==false,'Night stays night despite vivid palette');
check(strpos($prompt,'Новость не изображай и не придумывай')!==false,'No fabricated news when feed has no new event');
$many=['today'=>array_fill(0,80,['title'=>'Разная задача'])];
check(count(scene_sources($many))===80,'Large today list is not silently sliced');
$dir=sys_get_temp_dir().'/pulse-scenes-test-'.bin2hex(random_bytes(8));
mkdir($dir,0700);
try {
    file_put_contents($dir.'/20261125.json',json_encode(['id'=>'new','composition'=>'park','news'=>$news[0]]));
    file_put_contents($dir.'/20261124.json',json_encode(['id'=>'legacy','news'=>null]));
    file_put_contents($dir.'/broken.json','{');
    $archive=scene_history($dir);
    check(count($archive)===2 && $archive[0]['id']==='new','Legacy archives remain readable and broken metadata skipped');
    check(scene_news_used($news[0],$archive),'Successful archived scenes drive news deduplication');
} finally {
    foreach(glob($dir.'/*') as $path) unlink($path);
    rmdir($dir);
}
echo "All scene regression checks passed.".PHP_EOL;

function fake_scene_response(array $body, int $news=-1): array {
    $input=json_decode($body['input'],true);
    $map=[];
    foreach($input['sources'] as $source) $map[$source['id']]='Человек выполняет действие '.$source['id'];
    return ['status'=>'completed','output'=>[['content'=>[['type'=>'output_text','text'=>json_encode([
        'art_direction'=>'Общая панорама','episodes'=>(object)$map,'news_index'=>$news,'news_scene'=>$news>=0?'Новое событие':''
    ])]]]]];
}
$large=scene_sources(['today'=>array_fill(0,29,['title'=>'Задача'])]);
$calls=0;
$prepared=scene_prepare_plan($large,[],[],scene_composition([]),['news'=>null],[],
    static function($body) use (&$calls) {
        $calls++;
        $input=json_decode($body['input'],true);
        check(count($input['sources'])<=12,'Planning batch size bounded');
        check($body['text']['format']['schema']['properties']['episodes']['required']===array_column($input['sources'],'id'),'API schema requires every exact source ID');
        if($calls>1) check($input['shared_art_direction']==='Общая панорама','Batches share art direction');
        return fake_scene_response($body);
    });
check($calls===3 && count($prepared['episodes'])===29,'29 tasks merged from three complete batches');
$attempts=0;
$retried=scene_prepare_plan(array_slice($large,0,2),[],[],scene_composition([]),[],[],
    static function($body) use (&$attempts) {
        $attempts++;
        return $attempts===1?['status'=>'incomplete','output'=>[]]:fake_scene_response($body);
    });
check($attempts===2 && count($retried['episodes'])===2,'Truncated response automatically retried');
$attempts=0;
try {
    scene_prepare_plan(array_slice($large,0,2),[],[],scene_composition([]),[],[],
        static function($body) use (&$attempts) { $attempts++;return ['status'=>'completed','output'=>[]]; });
    throw new LogicException('Invalid response was accepted');
} catch(RuntimeException $e) {
    check($attempts===2 && strpos($e->getMessage(),'invalid_json')!==false,'Retry bounded and specific failure returned');
}
$empty=scene_prepare_plan([],[],[],scene_composition([]),[],[],static function($body){return fake_scene_response($body);});
check(count($empty['episodes'])===0,'Empty day is supported');
echo "Batch planning regression checks passed.".PHP_EOL;
