import AppKit
import Foundation
import UniformTypeIdentifiers
import WebKit

@main
final class AppDelegate: NSObject, NSApplicationDelegate, WKScriptMessageHandler {
  private var window: NSWindow!
  private var webView: WKWebView!

  func applicationDidFinishLaunching(_ notification: Notification) {
    let configuration = WKWebViewConfiguration()
    configuration.userContentController.add(self, name: "saveImage")

    webView = WKWebView(frame: .zero, configuration: configuration)
    webView.setValue(false, forKey: "drawsBackground")

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

    guard let indexURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "web") else {
      showError("Could not find the bundled web app.")
      return
    }

    let webRoot = indexURL.deletingLastPathComponent()
    webView.loadFileURL(indexURL, allowingReadAccessTo: webRoot)
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
