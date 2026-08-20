package com.specbridge.backend.service;

import com.specbridge.backend.dto.AnalyzeUrlResponse;
import com.specbridge.backend.dto.AnalyzeUrlResponse.JargonTerm;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.TextNode;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;

@Service
public class UrlAnalysisService {
    private final JargonExtractionService jargonExtractionService;

    public UrlAnalysisService(JargonExtractionService jargonExtractionService) {
        this.jargonExtractionService = jargonExtractionService;
    }

    public AnalyzeUrlResponse analyze(String rawUrl) throws IOException {
        URI uri = URI.create(rawUrl.trim());
        if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) {
            throw new IllegalArgumentException("http 또는 https URL만 분석할 수 있습니다.");
        }

        Document document = Jsoup.connect(uri.toString()).userAgent("SpecBridge/1.0").timeout(10000).get();
        Element body = document.body();
        if (body == null) throw new IllegalArgumentException("웹페이지 본문을 찾을 수 없습니다.");

        body.select("script, style, noscript").remove();
        List<JargonTerm> terms = jargonExtractionService.extract(body.text());
        highlightTextNodes(body, terms);
        return new AnalyzeUrlResponse(uri.toString(), body.html(), terms);
    }

    private void highlightTextNodes(Element body, List<JargonTerm> terms) {
        List<TextNode> textNodes = body.getAllElements().stream()
                .flatMap(element -> new ArrayList<>(element.textNodes()).stream())
                .toList();
        for (TextNode textNode : textNodes) {
            String highlighted = textNode.getWholeText();
            for (JargonTerm term : terms) {
                String replacement = "<span class=\"highlight-jargon\" data-explanation=\"" +
                        Entities.escape(term.explanation()) + "\">" + Entities.escape(term.term()) + "</span>";
                highlighted = highlighted.replaceAll("(?i)(?<![\\p{L}\\p{N}])" + java.util.regex.Pattern.quote(term.term()) + "(?![\\p{L}\\p{N}])", Matcher.quoteReplacement(replacement));
            }
            if (!highlighted.equals(textNode.getWholeText())) {
                textNode.after(Jsoup.parseBodyFragment(highlighted).body().childNodes());
                textNode.remove();
            }
        }
    }

    private static final class Entities {
        private static String escape(String value) {
            return value.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
        }
    }
}