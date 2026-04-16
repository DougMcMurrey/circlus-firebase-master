echo "These functions don't work in emulator for various reasons"
echo "and must be deployed to the development project."

declare -a ALL_FUNCTIONS=(
	"stripeWebhook"
	"onUserCreate"
	"onUserDelete"
	"firestoreBackup"
)

DEPLOY_CMD="NODE_ENV=development firebase deploy --only "

for FXN in "${ALL_FUNCTIONS[@]}"
	do
		DEPLOY_CMD="${DEPLOY_CMD}functions:$FXN,"
	done

echo $DEPLOY_CMD
echo $DEPLOY_CMD | bash