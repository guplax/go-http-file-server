package serverHandler

import (
	"errors"
	"net/http"
	"net/url"
)

const authQueryParam = "auth"

func (h *aliasHandler) needAuth(queryPrefix, vhostReqPath, reqFsPath string) (needAuth, requestAuth bool) {
	if queryPrefix == authQueryParam {
		return true, true
	}

	if h.auth.global {
		return true, false
	}

	if hasUrlOrDirPrefix(h.auth.urls, vhostReqPath, h.auth.dirs, reqFsPath) {
		return true, false
	}

	if matchPath, _ := hasUrlOrDirPrefixUsers(h.auth.urlsUsers, vhostReqPath, h.auth.dirsUsers, reqFsPath, -1); matchPath {
		return true, false
	}

	return false, false
}

func (h *aliasHandler) notifyAuth(w http.ResponseWriter) {
	w.Header().Set("WWW-Authenticate", "Basic realm=\"files\"")
}

func (h *aliasHandler) verifyAuth(r *http.Request, vhostReqPath, reqFsPath string) (authUserId int, authUserName string, err error) {
	inputUser, inputPass, hasAuthReq := r.BasicAuth()

	if hasAuthReq {
		userid, username, success := h.users.Auth(inputUser, inputPass)
		if success && userid >= 0 && (len(h.auth.urlsUsers) > 0 || len(h.auth.dirsUsers) > 0) {
			if matchPrefix, match := hasUrlOrDirPrefixUsers(h.auth.urlsUsers, vhostReqPath, h.auth.dirsUsers, reqFsPath, userid); matchPrefix {
				success = match
			}
		}
		if success {
			return userid, username, nil
		}
		err = errors.New(r.RemoteAddr + " auth failed")
	} else {
		err = errors.New(r.RemoteAddr + " missing auth info")
	}

	authUserId = -1
	return
}

func (h *aliasHandler) extractNoAuthUrl(r *http.Request, session *sessionContext, data *responseData) string {
	if session.query.Has(authQueryParam) {
		returnUrl := session.query.Get(authQueryParam)

		if len(returnUrl) > 0 {
			url, err := url.QueryUnescape(returnUrl)
			if err == nil {
				returnUrl = url
			}
		}

		if len(returnUrl) > 0 {
			return returnUrl
		}
	}

	referrer := r.Header.Get("Referer")
	if len(referrer) > 0 {
		return referrer
	}

	return session.prefixReqPath + data.Context.QueryString()
}
