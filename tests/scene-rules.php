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
check(substr_count($prompt,'Отдельная сцена:')===count($sources),'Image brief keeps every visual scene without technical numbering');
check(strpos($prompt,'task-0')===false && strpos($prompt,'project-')===false && strpos($prompt,'source_id')===false,'Image brief contains no technical scene identifiers');
check(strpos($prompt,'Продажи')!==false,'Image receives project context');
check(strpos($prompt,'Не рисуй списки задач')!==false && strpos($prompt,'Никакого средневековья')!==false,'No boards and contemporary setting enforced in image brief');
check(strpos($prompt,'Не превращай ночь в день')!==false,'Night stays night despite vivid palette');
check(strpos($prompt,'Новую проверенную новость')===false,'Image prompt has no obsolete no-news fallback');
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
