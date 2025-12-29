export CGO_ENABLED=${CGO_ENABLED:-0}
OUTDIR='../output'
MAINNAME='ghfs'
MOD=$(go list ../src/)
if [ "$VERSION" = 'default' ] || [ -z "$VERSION" ]; then
	source ./build.inc.version.sh
else
	export VERSION=$VERSION
fi
getLdFlags() {
	echo "-s -w -X $MOD/version.appVer=$VERSION -X $MOD/version.appArch=${ARCH:-$(go env GOARCH)}"
}
TAR=${TAR:-tar}
