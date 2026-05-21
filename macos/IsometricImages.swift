import AppKit
import Foundation
import UniformTypeIdentifiers
import WebKit

final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
  private let webRoot: URL

  init(webRoot: URL) {
    self.webRoot = webRoot
  }

  func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
    guard let url = urlSchemeTask.request.url else {
      urlSchemeTask.didFailWithError(NSError(domain: "IsometricImages", code: 1))
      return
    }

    let path = url.path == "/" || url.path.isEmpty ? "index.html" : String(url.path.dropFirst())
    let fileURL = webRoot.appendingPathComponent(path)

    do {
      let data = try Data(contentsOf: fileURL)
      let response = URLResponse(
        url: url,
        mimeType: mimeType(for: fileURL),
        expectedContentLength: data.count,
        textEncodingName: "utf-8"
      )
      urlSchemeTask.didReceive(response)
      urlSchemeTask.didReceive(data)
      urlSchemeTask.didFinish()
    } catch {
      urlSchemeTask.didFailWithError(error)
    }
  }

  func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

  private func mimeType(for url: URL) -> String {
    switch url.pathExtension.lowercased() {
    case "html": return "text/html"
    case "js": return "text/javascript"
    case "css": return "text/css"
    case "png": return "image/png"
    case "jpg", "jpeg": return "image/jpeg"
    case "svg": return "image/svg+xml"
    case "woff": return "font/woff"
    case "woff2": return "font/woff2"
    default: return "application/octet-stream"
    }
  }
}

final class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKNavigationDelegate {
  private var window: NSWindow!
  private var webView: WKWebView!
  private var schemeHandler: BundleSchemeHandler!

  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.regular)

    guard let webRoot = Bundle.main.resourceURL?.appendingPathComponent("web") else {
      showError("Could not find the bundled web app.")
      return
    }

    let configuration = WKWebViewConfiguration()
    schemeHandler = BundleSchemeHandler(webRoot: webRoot)
    configuration.setURLSchemeHandler(schemeHandler, forURLScheme: "isometric")
    configuration.userContentController.add(self, name: "saveImage")

    webView = WKWebView(frame: .zero, configuration: configuration)
    webView.navigationDelegate = self
    webView.setValue(true, forKey: "drawsBackground")

    window = NSWindow(
      contentRect: NSRect(x: 0, y: 0, width: 1180, height: 820),
      styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
      backing: .buffered,
      defer: false
    )
    window.title = "Isometric Images"
    window.center()
    window.contentView = webView
    window.makeKeyAndOrderFront(nil)
    NSApp.activate(ignoringOtherApps: true)

    webView.load(URLRequest(url: URL(string: "isometric://app/index.html")!))
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    true
  }

  func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
    guard message.name == "saveImage",
          let body = message.body as? [String: Any],
          let dataURL = body["dataUrl"] as? String else {
      return
    }

    let filename = body["filename"] as? String ?? "isometric-preview.png"
    savePNG(dataURL: dataURL, filename: filename)
  }

  func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
    showError("The app view could not load: \(error.localizedDescription)")
  }

  func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
    showError("The app view could not load: \(error.localizedDescription)")
  }

  private func savePNG(dataURL: String, filename: String) {
    guard let comma = dataURL.firstIndex(of: ",") else {
      showError("The exported image data was not valid.")
      return
    }

    let base64 = String(dataURL[dataURL.index(after: comma)...])
    guard let data = Data(base64Encoded: base64) else {
      showError("The exported image could not be decoded.")
      return
    }

    let panel = NSSavePanel()
    panel.nameFieldStringValue = filename
    panel.allowedContentTypes = [.png]
    panel.canCreateDirectories = true

    panel.beginSheetModal(for: window) { response in
      guard response == .OK, let url = panel.url else { return }
      do {
        try data.write(to: url, options: .atomic)
      } catch {
        self.showError("The image could not be saved.")
      }
    }
  }

  private func showError(_ text: String) {
    let alert = NSAlert()
    alert.messageText = "Isometric Images"
    alert.informativeText = text
    alert.alertStyle = .warning
    alert.runModal()
  }
}
