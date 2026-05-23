// Copyright (c) 2025 TikTok Pte. Ltd.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
package com.example.sparkling.go

import android.content.Context

object DebugDevUrlSupport {
    fun buildMainPageScheme(context: Context): String {
        val host = "127.0.0.1"
        val port = 3000
        return "hybrid://lynxview_page?bundle=http://$host:$port/main.lynx.bundle&hide_nav_bar=1&screen_orientation=portrait"
    }
}
