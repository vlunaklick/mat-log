<?php
// Runs inside the existing Coolify container over the administrator's SSH connection.
require '/var/www/html/vendor/autoload.php';
$app = require '/var/www/html/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$service = App\Models\Service::where('uuid', 'peohorsmczbc4vvmhczqtxz7')->firstOrFail();
$compose = file_get_contents('/tmp/mat-log-compose.yml');
validateDockerComposeForInjection($compose);
$service->docker_compose_raw = $compose;
$service->save();
App\Actions\Service\StartService::run($service);
echo "Deployment started in Coolify.\n";
